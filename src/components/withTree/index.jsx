// @flow

import type { List, Map as ImmutableMap } from 'immutable';
import * as React from 'react';
import isEmpty from 'lodash/isEmpty';
import pick from 'lodash/pick';
import omit from 'lodash/omit';
import queryString from 'query-string';
import hoistNonReactStatics from 'hoist-non-react-statics';
import { cachedValue, cachedSubscribe, cachedUnsubscribe } from '../../index';
import { logSubscribeError } from '../lib/error-logging';

const parameterNames = new Set([
  'depth',
  'sort',
  'order',
  'limit',
  'offset',
  'edgeContains',
  'filter',
  'type',
  'typesInTree',
  'typesInTreeWithDepth',
  'query',
  'includeInactive',
]);

const getParameters = (...args:Array<Object>):Parameters => pick(Object.assign({}, ...args), [...parameterNames]);

type Parameters = {
  depth?: number,
  sort?: string,
  order?: string,
  limit?: number,
  offset?: number,
  filter?: string,
  edgeContains?: string,
  type?: string | Array<string>,
  query?: string,
  typesInTree?: Array<string>,
  typesInTreeWithDepth?: Array<string>,
  includeInactive?: boolean,
  propertyName?: string,
  idName?: string,
  types?: string,
};

type State = {
  name?: string,
  tree?: List<ImmutableMap<string, *>>,
};

export default (parameters: Parameters = {}) => function wrap<Props: Object>(Component: React.AbstractComponent<Props>): React.AbstractComponent<$Diff<Props, { [string]: List<ImmutableMap<string, *>> }>> {
  const getName = (props: Props) => {
    const id = parameters.idName ? props[parameters.idName] : props.id;
    if (!id) {
      return undefined;
    }
    const options = getParameters(parameters, props);
    if (parameters.types) {
      if (!options.typesInTreeWithDepth) {
        options.typesInTreeWithDepth = JSON.parse(parameters.types);
      }
      console.warn('Deprecated in components/withTree: "types" is deprecated please use "typesInTreeWithDepth"');
    }
    if (isEmpty(options)) {
      return `n/${id}/tree`;
    }
    return `n/${id}/tree?${queryString.stringify(options)}`;
  };

  class NewComponent extends React.Component<Props, State> {
    static getDerivedStateFromProps(nextProps: Props, prevState: State) {
      const name = getName(nextProps);
      if (name !== prevState.name) {
        return {
          name,
          tree: cachedValue(name),
        };
      }
      return null;
    }

    constructor(props: Props) {
      super(props);
      const name = getName(props);
      this.state = {
        name,
        tree: cachedValue(name),
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
      if (this.state.tree !== nextState.tree) {
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
        tree: value,
      });
    }

    handleError = (error:Error) => {
      logSubscribeError(this.state.name, error);
    }

    render() {
      const props = omit(this.props, [...parameterNames]);
      props[parameters.propertyName || 'tree'] = this.state.tree;
      return <Component {...props} />;
    }
  }

  hoistNonReactStatics(NewComponent, Component);

  return NewComponent;
};

