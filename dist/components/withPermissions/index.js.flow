// @flow

import { Set as ImmutableSet } from 'immutable';
import * as React from 'react';
import hoistNonReactStatics from 'hoist-non-react-statics';
import { cachedValue, cachedSubscribe, cachedUnsubscribe } from '../../index';
import { logSubscribeError } from '../lib/error-logging';

type Parameters = {
  propertyName?: string,
  idName?: string,
  sourceIdName?: string,
};

type State = {
  name?: string,
  permissions?: ImmutableSet<string>,
};

export default (parameters: Parameters = {}) => function wrap<Props: Object>(Component: React.AbstractComponent<Props>): React.AbstractComponent<$Diff<Props, { [string]: ImmutableSet<string> }>> {
  const getName = (props: Props) => {
    const id = parameters.idName ? props[parameters.idName] : props.id;
    const sourceId = parameters.sourceIdName ? props[parameters.sourceIdName] : props.sourceId;
    if (!sourceId || !id) {
      return undefined;
    }
    return `p/${sourceId}/${id}`;
  };

  class NewComponent extends React.Component<Props, State> {
    static getDerivedStateFromProps(nextProps: Props, prevState: State) {
      const name = getName(nextProps);
      if (name !== prevState.name) {
        return {
          name,
          permissions: cachedValue(name),
        };
      }
      return null;
    }

    constructor(props: Props) {
      super(props);
      const name = getName(props);
      this.state = {
        name,
        permissions: cachedValue(name),
      };
    }

    async componentDidMount() {
      if (this.state.name) {
        cachedSubscribe(this.state.name, this.handleUpdate, this.handleError);
      }
    }

    shouldComponentUpdate(nextProps:Props, nextState:State) {
      if (this.state.name !== nextState.name) {
        const name = this.state.name;
        if (name) {
          cachedUnsubscribe(name, this.handleUpdate, this.handleError);
        }
        if (nextState.name) {
          cachedSubscribe(nextState.name, this.handleUpdate, this.handleError);
        }
      }
      if (this.state.permissions !== nextState.permissions) {
        return true;
      }
      const nextPropsKeys = Object.keys(nextProps);
      const propsKeys = Object.keys(this.props);
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


    handleUpdate = (value:any) => {
      this.setState({
        permissions: value,
      });
    }

    handleError = (error:Error) => {
      logSubscribeError(this.state.name, error);
    }
    
    render() {
      const props = Object.assign({}, { [parameters.propertyName || 'permissions']: this.state.permissions }, this.props);
      return <Component {...props} />;
    }
  }

  hoistNonReactStatics(NewComponent, Component);

  return NewComponent;
};

