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
  'filterNamed',
  'query',
]);

const getParameters = (...args:Array<Object>):Parameters => pick(Object.assign({}, ...args), [...parameterNames]);

type Parameters = {
  limit?: number,
  offset?: number,
  filterNamed?: boolean,
  query?: string,
  propertyName?: string,
  idName?: string,
  teamIdName?: string,
  idsName?: string,
};

type State = {
  name?: string,
  notifications?: List<string>
};

export default (parameters: Parameters = {}) => function wrap<Props: Object>(Component: React.AbstractComponent<Props>): React.AbstractComponent<$Diff<Props, { [string]: List<string> }>> {
  const getName = (props: Props) => {
    const id = parameters.idName ? props[parameters.idName] : props.id;
    const ids = parameters.idsName ? props[parameters.idsName] : props.ids;
    const teamId = parameters.teamIdName ? props[parameters.teamIdName] : props.teamId;

    const hasIds = (Array.isArray(ids) && ids.length > 0);
    if ((!id && !hasIds) || !teamId) {
      return undefined;
    }
    const nodeIds = hasIds ? ids.join('/') : id;
    const options = getParameters(parameters, props);
    if (isEmpty(options)) {
      return `notifications/${teamId}/${nodeIds}`;
    }
    return `notifications/${teamId}/${nodeIds}?${queryString.stringify(options)}`;
  };

  class NewComponent extends React.Component<Props, State> {
    static getDerivedStateFromProps(nextProps: Props, prevState: State) {
      const name = getName(nextProps);
      if (name !== prevState.name) {
        return {
          name,
          notifications: cachedValue(name),
        };
      }
      return null;
    }

    constructor(props: Props) {
      super(props);
      const name = getName(props);
      this.state = {
        name,
        notifications: cachedValue(name),
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
      if (this.state.notifications !== nextState.notifications) {
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


    handleUpdate = (value:any) => {
      this.setState({
        notifications: value,
      });
    }

    handleError = (error:Error) => {
      logSubscribeError(this.state.name, error);
    }
    
    render() {
      const props = omit(this.props, [...parameterNames]);
      props[parameters.propertyName || 'notifications'] = this.state.notifications;
      return <Component {...props} />;
    }
  }

  hoistNonReactStatics(NewComponent, Component);

  return NewComponent;
};
