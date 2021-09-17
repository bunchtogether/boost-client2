// @flow
import type { List } from 'immutable';
import * as React from 'react';
import isEmpty from 'lodash/isEmpty';
import pick from 'lodash/pick';
import omit from 'lodash/omit';
import queryString from 'query-string';
import hoistNonReactStatics from 'hoist-non-react-statics';
import { cachedValue, cachedSubscribe, cachedUnsubscribe } from '../../index';
import { logSubscribeError } from '../lib/error-logging';

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
  keiser?: List<string>
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
      return `keiser/${teamId}/${id}`;
    }
    return `keiser/${teamId}/${id}?${queryString.stringify(options)}`;
  };

  class NewComponent extends React.Component<Props, State> {
    static getDerivedStateFromProps(nextProps: Props, prevState: State) {
      const name = getName(nextProps);
      if (name !== prevState.name) {
        return {
          name,
          keiser: cachedValue(name),
        };
      }
      return null;
    }

    constructor(props: Props) {
      super(props);
      const name = getName(props);
      this.state = {
        name,
        keiser: cachedValue(name),
      };
    }

    async componentDidMount() {
      if (this.state.name) {
        cachedSubscribe(this.state.name, this.handleUpdate, this.handleError);
      }
    }

    shouldComponentUpdate(nextProps: Props, nextState: State) {
      if (this.state.name !== nextState.name) {
        const name = this.state.name;
        if (name) {
          cachedUnsubscribe(name, this.handleUpdate, this.handleError);
        }
        if (nextState.name) {
          cachedSubscribe(nextState.name, this.handleUpdate, this.handleError);
        }
      }
      if (this.state.keiser !== nextState.keiser) {
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
        cachedUnsubscribe(this.state.name, this.handleUpdate, this.handleError);
      }
    }


    handleUpdate = (value: any) => {
      this.setState({
        keiser: value,
      });
    }

    handleError = (error:Error) => {
      logSubscribeError(this.state.name, error);
    }
    
    render() {
      const props = omit(this.props, [...parameterNames]);
      props[parameters.propertyName || 'keiser'] = this.state.keiser;
      return <Component {...props} />;
    }
  }

  hoistNonReactStatics(NewComponent, Component);

  return NewComponent;
};
