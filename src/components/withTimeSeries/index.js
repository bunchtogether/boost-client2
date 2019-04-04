// @flow

import * as React from 'react';
import { Map as ImmutableMap, List } from 'immutable';
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

export default (parameters: Parameters = { delta: 60, end: Date.now(), machines: [], names: [] }) => function wrap<Props: Object>(Component: React.AbstractComponent<Props>): React.AbstractComponent<$Diff<Props, { [string]: ImmutableMap<string, ImmutableMap<string, List>> }>> {   // eslint-disable-line
  class NewComponent extends React.Component<Props, State> {
    constructor(props: Props) {
      super(props);
      this.eventHandlerFunctions = {};
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
      if (this.props.names !== nextProps.names || this.props.machines !== nextProps.machines || this.props.delta !== nextProps.delta || this.props.end !== nextProps.end) {
        const names = this.props.names;
        const machines = this.props.machines;
        const oldmachines = machines.subtract(nextProps.machines);
        const oldNames = names.subtract(nextProps.names);
        const newmachines = nextProps.machines.subtract(machines);
        const newNames = nextProps.names.subtract(names);
        let values = nextState.values;
        for (const machine of oldmachines) {
          for (const name of oldNames) {
            this.unsubscribeToValueUpdates(machine, name);
          }
          values = values.delete(machine);
        }
        for (const machine of newmachines) {
          values = values.set(machine, ImmutableMap());
          for (const name of newNames) {
            values = values.setIn([machine, name], List());
            this.fetchInitialValues(machine, name, nextProps.delta, nextProps.end);
            this.subscribeToValueUpdates(machine, name);
          }
        }
        if (this.mounted) {
          this.setState({ values });
        }
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
    }


    async setupInitialState(machines: Array<string>, names: Array<string>, delta: number, end?: number = Date.now()) {
      let machinesValues = this.state.values;
      const initialValues = this.fetchInitialValues(machines, names, delta, end);
      const initialData = ImmutableMap(initialValues);
      for (const [machineName, machineData] of initialData.entries()) {
        for (const [name, nameValues] of Object.entries(machineData)) {
          machinesValues = machinesValues.setIn([machineName, name], List(nameValues));
          this.subscribeToValueUpdates(machineName, name);
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

    async fetchInitialValues(machines: Array<string>, names: Array<string>, delta: number, end?: number = Date.now()) {   // eslint-disable-line
      // fetch
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
      // console.log('SUBSCRIBING TO', eventHandlerName);
      const handler = (data: DataPoint) => {
        const list = this.state.values.getIn([machine, name]);
        if (list && data.value && this.mounted) {
          // console.log(`SUBSCRIPTION TRIGGERED ${machine}/${name}`, data);
          const newValue = list.shift().push([data.timestamp, data.value]);
          this.setState({ values: this.state.values.setIn([machine, name], newValue) });
        }
      };
      braidClient.addServerEventListener(eventHandlerName, handler);
      this.eventHandlerFunctions[eventHandlerName] = handler;
    }

    unsubscribeToValueUpdates(machine: string, name: string) {
      const eventHandlerName = `timeseries/${machine}/${name}`;
      // console.log('UNSUBSCRIBING TO', eventHandlerName);
      const handler = this.eventHandlerFunctions[eventHandlerName];
      braidClient.removeServerEventListener(eventHandlerName, handler);
    }

    render() {
      return <Component values={this.state.values} {...this.props} />;
    }
  }

  hoistNonReactStatics(NewComponent, Component);

  return NewComponent;
};

