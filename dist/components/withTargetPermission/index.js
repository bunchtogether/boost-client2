//      

                                      
import * as React from 'react';
import { isEmpty, pick, omit } from 'lodash';
import queryString from 'query-string';
import hoistNonReactStatics from 'hoist-non-react-statics';
import { cachedValue, cachedSubscribe, cachedUnsubscribe } from '../..';

const parameterNames = new Set([
  'sort',
  'order',
  'limit',
  'offset',
  'filter',
  'type',
  'query',
  'hasChild',
  'hasParent',
]);

const getParameters = (...args              )            => pick(Object.assign({}, ...args), [...parameterNames]);

                   
               
                
                
                 
                 
               
                
                    
                     
                        
                      
  

              
                
                         
  

export default (parameters             = {}) => function wrap               (Component                                )                                                                    {
  const getName = (props       ) => {
    const permission = props.permission || parameters.permission;
    if (!props.id || !permission) {
      return undefined;
    }
    const options = getParameters(parameters, props);
    if (isEmpty(options)) {
      return `p/${permission}/${props.id}`;
    }
    return `p/${permission}/${props.id}?${queryString.stringify(options)}`;
  };

  class NewComponent extends React.Component               {
    static getDerivedStateFromProps(nextProps       , prevState       ) {
      const name = getName(nextProps);
      if (name !== prevState.name) {
        return {
          name,
          sources: cachedValue(name),
        };
      }
      return null;
    }

    constructor(props       ) {
      super(props);
      const name = getName(props);
      this.state = {
        name,
        sources: cachedValue(name),
      };
    }

    async componentDidMount() {
      if (this.state.name) {
        cachedSubscribe(this.state.name, this.handleUpdate);
      }
    }

    shouldComponentUpdate(nextProps      , nextState      ) {
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


    handleUpdate = (value    ) => {
      this.setState({
        sources: value,
      });
    }

    render() {
      const props = omit(this.props, [...parameterNames]);
      props[parameters.propertyName || 'sources'] = this.state.sources;
      return <Component {...props} />;
    }
  }

  hoistNonReactStatics(NewComponent, Component);

  return NewComponent;
};

