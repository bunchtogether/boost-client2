// @flow

import * as React from 'react';
import { Map as ImmutableMap, List, is } from 'immutable';
import hoistNonReactStatics from 'hoist-non-react-statics';
import { braidClient } from '../..';
import { agent } from '../../api-agent';

type DataPoint = {
  timestamp: string,
  machine: string,
  name: string,
  value: number,
};

type Parameters = {
  delta: number,
  end?: number,
  machines: ImmutableMap<string>,
  names: ImmutableMap<string>,
};

type State = {
  values: ImmutableMap<string, ImmutableMap<string, List>>
};

function isLive(ms: number) {
  const mins = (ms / 1000) / 60;
  return mins < 10;
}

export default (parameters: Parameters = { delta: 60, end: Date.now(), machines: [], names: [] }) => function wrap<Props: Object>(Component: React.AbstractComponent<Props>): React.AbstractComponent<$Diff<Props, { [string]: ImmutableMap<string, ImmutableMap<string, List>> }>> {   // eslint-disable-line
  class NewComponent extends React.Component<Props, State> {
    constructor(props: Props) {
      super(props);
      this.eventHandlerFunctions = {};
      this.subscriptions = new Set();
      this.state = {
        values: ImmutableMap(),
      };
      this.mounted = false;
    }

    componentDidMount() {
      this.mounted = true;
      this.setupInitialState(this.props.machines, this.props.names, this.props.delta);
    }

    shouldComponentUpdate(nextProps: Props, nextState: State) {
      if (!is(this.props.machines, nextProps.machines) || !is(this.props.names, nextProps.names) || this.props.delta !== nextProps.delta || this.props.end !== nextProps.end) {
        const names = this.props.names;
        (async () => {
          let values = nextState.values;
          for (const machine of this.props.machines) {
            for (const name of names) {
              this.unsubscribeToValueUpdates(machine, name);
            }
            values = values.delete(machine);
          }
          this.unsubscribeToAllUpdates();
          for (const machine of nextProps.machines) {
            values = values.set(machine, ImmutableMap());
            for (const name of names) {
              const newData = await this.fetchValues([machine], [name], nextProps.delta, nextProps.end);
              if (newData[machine]) {
                for (const valueName of Object.keys(newData[machine])) {
                  values = values.setIn([machine, valueName], List(newData[machine][valueName]));
                  if (isLive(nextProps.delta)) {
                    this.subscriptions.add(`timeseries/${machine}/${valueName}`);
                    this.subscribeToValueUpdates(machine, valueName);
                  }
                }
              }
            }
          }
          if (this.mounted) {
            this.setState({ values });
          }
        })();
      }
      return this.state.values !== nextState.values;
    }

    async componentWillUnmount() {
      this.mounted = false;
      for (const machine of this.props.machines) {
        for (const name of this.props.names) {
          this.unsubscribeToValueUpdates(machine, name);
        }
      }
      this.unsubscribeToAllUpdates();
    }


    async setupInitialState(machines: Array<string>, names: Array<string>, delta: number, end?: number = Date.now()) {
      let machinesValues = this.state.values;
      for (const machine of machines) {
        for (const singleName of names) {
          const initialValues = await this.fetchValues([machine], [singleName], delta, end);
          const initialData = ImmutableMap(initialValues);
          for (const [machineName, machineData] of initialData.entries()) {
            for (const [name, nameValues] of Object.entries(machineData)) {
              machinesValues = machinesValues.setIn([machineName, name], List(nameValues));
              if (isLive(delta)) {
                this.subscribeToValueUpdates(machineName, name);
              }
            }
          }
        }
      }
      if (this.mounted) {
        this.setState({
          values: machinesValues,
        });
      }
    }

    eventHandlerFunctions: Object;
    mounted: boolean;
    subscriptions: Set<string>;

    async fetchValues(machines: Array<string>, names: Array<string>, delta: number, end?: number = Date.now()) {   // eslint-disable-line
      try {
        const timeseriesData = await agent.get(`/timeseries/${delta}/${end}`)
          .query({
            machines: machines.join(','),
            names: names.join(','),
          });
        return timeseriesData.body;
      } catch (error) {
        console.error('Error fetching initial time series values: ', error);
        return [];
      }
    }

    subscribeToValueUpdates(machine: string, name: string) {
      const eventHandlerName = `timeseries/${machine}/${name}`;
      const handler = (data: DataPoint) => {
        const list = this.state.values.getIn([machine, name]);
        if (list && data.value && this.mounted) {
          const newValue = list.shift().push([data.timestamp, data.value]);
          this.setState({ values: this.state.values.setIn([machine, name], newValue) });
        }
      };
      braidClient.addServerEventListener(eventHandlerName, handler);
      this.eventHandlerFunctions[eventHandlerName] = handler;
    }

    unsubscribeToValueUpdates(machine: string, name: string) {
      const eventHandlerName = `timeseries/${machine}/${name}`;
      const handler = this.eventHandlerFunctions[eventHandlerName];
      braidClient.removeServerEventListener(eventHandlerName, handler);
    }

    unsubscribeToAllUpdates() {
      for (const eventHandlerName of this.subscriptions) {
        const handler = this.eventHandlerFunctions[eventHandlerName];
        braidClient.removeServerEventListener(eventHandlerName, handler);
        this.subscriptions.delete(eventHandlerName);
      }
    }

    render() {
      return <Component values={this.state.values} {...this.props} />;
    }
  }

  hoistNonReactStatics(NewComponent, Component);

  return NewComponent;
};

