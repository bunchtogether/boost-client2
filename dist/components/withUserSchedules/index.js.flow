// @flow
import type { List } from 'immutable';
import * as React from 'react';
import { isEmpty, pick, omit } from 'lodash';
import queryString from 'query-string';
import hoistNonReactStatics from 'hoist-non-react-statics';
import { cachedValue, cachedSubscribe, cachedUnsubscribe } from '../..';

const parameterNames = new Set([
  'limit',
  'offset',
  'startDate',
  'endDate',
  'query',
  'hasParent',
]);

const getParameters = (...args: Array<Object>): Parameters => pick(Object.assign({}, ...args), [...parameterNames]);

type Parameters = {
  limit?: number,
  offset?: number,
  startDate?: number,
  endDate?: number,
  query?: string,
  propertyName?: string,
  idName?: string,
  teamIdName?: string,
};

type State = {
  name?: string,
  schedules?: List<string>
};

export default (parameters: Parameters = {}) => function wrap<Props: Object>(Component: React.AbstractComponent<Props>): React.AbstractComponent<$Diff<Props, { [string]: List<string> }>> {
  const getName = (props: Props) => {
    const id = parameters.idName ? props[parameters.idName] : props.id; //
    const teamId = parameters.teamIdName ? props[parameters.teamIdName] : props.teamId;
    if (!id || !teamId) {
      return undefined;
    }
    const options = getParameters(parameters, props);
    if (isEmpty(options)) {
      return `schedules/${teamId}/${id}`;
    }
    return `schedules/${teamId}/${id}?${queryString.stringify(options)}`;
  };

  class NewComponent extends React.Component<Props, State> {
    static getDerivedStateFromProps(nextProps: Props, prevState: State) {
      const name = getName(nextProps);
      if (name !== prevState.name) {
        return {
          name,
          schedules: cachedValue(name),
        };
      }
      return null;
    }

    constructor(props: Props) {
      super(props);
      const name = getName(props);
      this.state = {
        name,
        schedules: cachedValue(name),
      };
    }

    async componentDidMount() {
      if (this.state.name) {
        cachedSubscribe(this.state.name, this.handleUpdate);
      }
    }

    shouldComponentUpdate(nextProps: Props, nextState: State) {
      if (this.state.name !== nextState.name) {
        const name = this.state.name;
        if (name) {
          cachedUnsubscribe(name, this.handleUpdate);
        }
        if (nextState.name) {
          cachedSubscribe(nextState.name, this.handleUpdate);
        }
      }
      if (this.state.schedules !== nextState.schedules) {
        return true;
      }
      const nextPropsKeys = Object.keys(nextProps).filter((key) => !parameterNames.has(key));
      const propsKeys = Object.keys(this.props).filter((key) => !parameterNames.has(key));
      if (nextPropsKeys.length !== propsKeys.length) {
        return true;
      }
      for (let i = 0; i < propsKeys.length; i += 1) {
        const key = propsKeys[i];
        if (nextProps[key] !== this.props[key]) {
          return true;
        }
      }
      return false;
    }

    async componentWillUnmount() {
      if (this.state.name) {
        cachedUnsubscribe(this.state.name, this.handleUpdate);
      }
    }


    handleUpdate = (value: any) => {
      this.setState({
        schedules: value,
      });
    }

    render() {
      const props = omit(this.props, [...parameterNames]);
      props[parameters.propertyName || 'schedules'] = this.state.schedules;
      return <Component {...props} />;
    }
  }

  hoistNonReactStatics(NewComponent, Component);

  return NewComponent;
};
