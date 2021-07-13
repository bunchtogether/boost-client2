function _defineProperty(obj, key, value) { if (key in obj) { Object.defineProperty(obj, key, { value: value, enumerable: true, configurable: true, writable: true }); } else { obj[key] = value; } return obj; }

import * as React from 'react';
import { isEmpty, pick, omit } from 'lodash';
import queryString from 'query-string';
import hoistNonReactStatics from 'hoist-non-react-statics';
import { cachedValue, cachedSubscribe, cachedUnsubscribe } from '../../index';
const parameterNames = new Set(['sort', 'order', 'limit', 'offset', 'filter', 'type', 'query', 'readPermission', 'hasChild', 'hasParent', 'onlineInTeam', 'parentEdgeContains', 'typesInTree']);

const getParameters = (...args) => pick(Object.assign({}, ...args), [...parameterNames]);

export default ((parameters = {}) => function wrap(Component) {
  const getName = props => {
    const id = parameters.idName ? props[parameters.idName] : props.id;
    const ids = parameters.idsName ? props[parameters.idsName] : props.ids;
    const permission = props.permission || parameters.permission;

    if (!props.id && !props.ids || !permission) {
      return undefined;
    }

    const options = getParameters(parameters, props);
    const parts = ['p'];

    if (id) {
      parts.push(id);
    } else {
      for (const idString of ids) {
        parts.push(idString);
      }
    }

    parts.push(permission);

    if (isEmpty(options)) {
      return parts.join('/');
    }

    return `${parts.join('/')}?${queryString.stringify(options)}`;
  };

  class NewComponent extends React.Component {
    static getDerivedStateFromProps(nextProps, prevState) {
      const name = getName(nextProps);

      if (name !== prevState.name) {
        return {
          name,
          targets: cachedValue(name)
        };
      }

      return null;
    }

    constructor(props) {
      super(props);

      _defineProperty(this, "handleUpdate", value => {
        this.setState({
          targets: value
        });
      });

      const name = getName(props);
      this.state = {
        name,
        targets: cachedValue(name)
      };
    }

    async componentDidMount() {
      if (this.state.name) {
        cachedSubscribe(this.state.name, this.handleUpdate);
      }
    }

    shouldComponentUpdate(nextProps, nextState) {
      if (this.state.name !== nextState.name) {
        const name = this.state.name;

        if (name) {
          cachedUnsubscribe(name, this.handleUpdate);
        }

        if (nextState.name) {
          cachedSubscribe(nextState.name, this.handleUpdate);
        }
      }

      if (this.state.targets !== nextState.targets) {
        return true;
      }

      const nextPropsKeys = Object.keys(nextProps).filter(key => !parameterNames.has(key));
      const propsKeys = Object.keys(this.props).filter(key => !parameterNames.has(key));

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

    render() {
      const props = omit(this.props, [...parameterNames]);
      props[parameters.propertyName || 'targets'] = this.state.targets;
      return /*#__PURE__*/React.createElement(Component, props);
    }

  }

  hoistNonReactStatics(NewComponent, Component);
  return NewComponent;
});
//# sourceMappingURL=index.js.map