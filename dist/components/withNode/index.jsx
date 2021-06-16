//      

                                                     
import * as React from 'react';
import hoistNonReactStatics from 'hoist-non-react-statics';
import { cachedValue, cachedSubscribe, cachedUnsubscribe } from '../..';

                   
                        
                  
  

              
                
                                
  

export default (parameters             = {}) => function wrap               (Component                                )                                                                               {
  const getName = (props       ) => {
    const id = parameters.idName ? props[parameters.idName] : props.id;
    if (!id) {
      return undefined;
    }
    return `n/${id}`;
  };

  class NewComponent extends React.Component               {
    static getDerivedStateFromProps(nextProps       , prevState       ) {
      const name = getName(nextProps);
      if (name !== prevState.name) {
        return {
          name,
          node: cachedValue(name),
        };
      }
      return null;
    }

    constructor(props       ) {
      super(props);
      const name = getName(props);
      this.state = {
        name,
        node: cachedValue(name),
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
      if (this.state.node !== nextState.node) {
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
        cachedUnsubscribe(this.state.name, this.handleUpdate);
      }
    }


    handleUpdate = (value    ) => {
      this.setState({
        node: value,
      });
    }

    render() {
      const props = Object.assign({}, { [parameters.propertyName || 'node']: this.state.node }, this.props);
      return <Component {...props} />;
    }
  }

  hoistNonReactStatics(NewComponent, Component);

  return NewComponent;
};
