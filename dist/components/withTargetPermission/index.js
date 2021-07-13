function _defineProperty(obj, key, value) { if (key in obj) { Object.defineProperty(obj, key, { value: value, enumerable: true, configurable: true, writable: true }); } else { obj[key] = value; } return obj; }

import * as React from 'react';
import { isEmpty, pick, omit } from 'lodash';
import queryString from 'query-string';
import hoistNonReactStatics from 'hoist-non-react-statics';
import { cachedValue, cachedSubscribe, cachedUnsubscribe } from '../../index';
const parameterNames = new Set(['sort', 'order', 'limit', 'offset', 'filter', 'type', 'query', 'hasChild', 'hasParent']);

const getParameters = (...args) => pick(Object.assign({}, ...args), [...parameterNames]);

export default ((parameters = {}) => function wrap(Component) {
  const getName = props => {
    const id = parameters.idName ? props[parameters.idName] : props.id;
    const permission = props.permission || parameters.permission;

    if (!id || !permission) {
      return undefined;
    }

    const options = getParameters(parameters, props);

    if (isEmpty(options)) {
      return `p/${permission}/${id}`;
    }

    return `p/${permission}/${id}?${queryString.stringify(options)}`;
  };

  class NewComponent extends React.Component {
    static getDerivedStateFromProps(nextProps, prevState) {
      const name = getName(nextProps);

      if (name !== prevState.name) {
        return {
          name,
          sources: cachedValue(name)
        };
      }

      return null;
    }

    constructor(props) {
      super(props);

      _defineProperty(this, "handleUpdate", value => {
        this.setState({
          sources: value
        });
      });

      const name = getName(props);
      this.state = {
        name,
        sources: cachedValue(name)
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

      if (this.state.sources !== nextState.sources) {
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
      props[parameters.propertyName || 'sources'] = this.state.sources;
      return /*#__PURE__*/React.createElement(Component, props);
    }

  }

  hoistNonReactStatics(NewComponent, Component);
  return NewComponent;
});
//# sourceMappingURL=index.js.map