//      
                                      
import * as React from 'react';
import { isEmpty, pick, omit } from 'lodash';
import queryString from 'query-string';
import hoistNonReactStatics from 'hoist-non-react-statics';
import { cachedValue, cachedSubscribe, cachedUnsubscribe } from '../..';

const parameterNames = new Set([
  'depth',
  'sort',
  'order',
  'limit',
  'offset',
  'filter',
  'edgeContains',
  'hasChild',
  'hasParent',
  'type',
  'query',
  'includeInactive',
]);

const getParameters = (...args              )            => pick(Object.assign({}, ...args), [...parameterNames]);

                   
                 
                
                 
                 
                  
                  
                        
                    
                     
                                
                 
                            
                       
  

              
                
                          
  

export default (parameters             = {}) => function wrap               (Component                                )                                                                    {
  const getName = (props       ) => {
    if (!props.id) {
      return undefined;
    }
    const options = getParameters(parameters, props);
    if (options.type && typeof options.type === 'string') {
      options.type = options.type.split(',');
    }
    if (isEmpty(options)) {
      return `n/${props.id}/ancestors`;
    }
    return `n/${props.id}/ancestors?${queryString.stringify(options)}`;
  };

  class NewComponent extends React.Component               {
    static getDerivedStateFromProps(nextProps       , prevState       ) {
      const name = getName(nextProps);
      if (name !== prevState.name) {
        return {
          name,
          ancestors: cachedValue(name),
        };
      }
      return null;
    }

    constructor(props       ) {
      super(props);
      const name = getName(props);
      this.state = {
        name,
        ancestors: cachedValue(name),
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
      if (this.state.ancestors !== nextState.ancestors) {
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
        ancestors: value,
      });
    }

    render() {
      const props = omit(this.props, [...parameterNames]);
      props[parameters.propertyName || 'ancestors'] = this.state.ancestors;
      return <Component {...props} />;
    }
  }

  hoistNonReactStatics(NewComponent, Component);

  return NewComponent;
};

