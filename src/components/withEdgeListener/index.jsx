// @flow

import type { Map as ImmutableMap } from 'immutable';
import * as React from 'react';
import { isEmpty, pick, omit } from 'lodash';
import queryString from 'query-string';
import hoistNonReactStatics from 'hoist-non-react-statics';
import { cachedValue, cachedSubscribe, cachedUnsubscribe } from '../../index';

const parameterNames = new Set([
  'parentId',
  'parentType',
  'childId',
  'childType',
  'contains',
]);

const getParameters = (...args:Array<Object>):Parameters => pick(Object.assign({}, ...args), [...parameterNames]);

type Parameters = {
  parentId?: string,
  parentType?: string,
  childId?: string,
  childType?: string,
  contains?: string,
  propertyName?: string
};

type State = {
  name?: string,
  edge?: ImmutableMap<string, *>
};

export default (parameters: Parameters = {}) => function wrap<Props: Object>(Component: React.AbstractComponent<Props>): React.AbstractComponent<$Diff<Props, { [string]: ImmutableMap<string, *> }>> {
  const getName = (props: Props) => {
    const options = getParameters(parameters, props);
    if (isEmpty(options)) {
      return undefined;
    }
    return `e?${queryString.stringify(options)}`;
  };

  class NewComponent extends React.Component<Props, State> {
    static getDerivedStateFromProps(nextProps: Props, prevState: State) {
      const name = getName(nextProps);
      if (name !== prevState.name) {
        return {
          name,
          edge: cachedValue(name),
        };
      }
      return null;
    }

    constructor(props: Props) {
      super(props);
      const name = getName(props);
      this.state = {
        name,
        edge: cachedValue(name),
      };
    }

    async componentDidMount() {
      if (this.state.name) {
        cachedSubscribe(this.state.name, this.handleUpdate);
      }
    }

    shouldComponentUpdate(nextProps:Props, nextState:State) {
      if (this.state.name !== nextState.name) {
        const name = this.state.name;
        if (name) {
          cachedUnsubscribe(name, this.handleUpdate);
        }
        if (nextState.name) {
          cachedSubscribe(nextState.name, this.handleUpdate);
        }
      }
      if (this.state.edge !== nextState.edge) {
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


    handleUpdate = (value:any) => {
      this.setState({
        edge: value,
      });
    }

    render() {
      const props = omit(this.props, [...parameterNames]);
      props[parameters.propertyName || 'edge'] = this.state.edge;
      return <Component {...props} />;
    }
  }

  hoistNonReactStatics(NewComponent, Component);

  return NewComponent;
};

