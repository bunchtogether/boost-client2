function _defineProperty(obj, key, value) { if (key in obj) { Object.defineProperty(obj, key, { value: value, enumerable: true, configurable: true, writable: true }); } else { obj[key] = value; } return obj; }

import * as React from 'react';
import isEmpty from 'lodash/isEmpty';
import pick from 'lodash/pick';
import omit from 'lodash/omit';
import queryString from 'query-string';
import hoistNonReactStatics from 'hoist-non-react-statics';
import { cachedValue, cachedSubscribe, cachedUnsubscribe } from '../../index';
import { logSubscribeError } from '../lib/error-logging';
const parameterNames = new Set(['limit', 'offset', 'startDate', 'endDate', 'query', 'hasParent']);

const getParameters = (...args) => pick(Object.assign({}, ...args), [...parameterNames]);

export default ((parameters = {}) => function wrap(Component) {
  const getName = props => {
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

  class NewComponent extends React.Component {
    static getDerivedStateFromProps(nextProps, prevState) {
      const name = getName(nextProps);

      if (name !== prevState.name) {
        return {
          name,
          schedules: cachedValue(name)
        };
      }

      return null;
    }

    constructor(props) {
      super(props);

      _defineProperty(this, "handleUpdate", value => {
        this.setState({
          schedules: value
        });
      });

      _defineProperty(this, "handleError", error => {
        logSubscribeError(this.state.name, error);
      });

      const name = getName(props);
      this.state = {
        name,
        schedules: cachedValue(name)
      };
    }

    async componentDidMount() {
      if (this.state.name) {
        cachedSubscribe(this.state.name, this.handleUpdate, this.handleError);
      }
    }

    shouldComponentUpdate(nextProps, nextState) {
      if (this.state.name !== nextState.name) {
        const name = this.state.name;

        if (name) {
          cachedUnsubscribe(name, this.handleUpdate, this.handleError);
        }

        if (nextState.name) {
          cachedSubscribe(nextState.name, this.handleUpdate, this.handleError);
        }
      }

      if (this.state.schedules !== nextState.schedules) {
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
        cachedUnsubscribe(this.state.name, this.handleUpdate, this.handleError);
      }
    }

    render() {
      const props = omit(this.props, [...parameterNames]);
      props[parameters.propertyName || 'schedules'] = this.state.schedules;
      return /*#__PURE__*/React.createElement(Component, props);
    }

  }

  hoistNonReactStatics(NewComponent, Component);
  return NewComponent;
});
//# sourceMappingURL=index.js.map