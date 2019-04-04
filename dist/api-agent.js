//      

import superagent from 'superagent';
import makeAgent from 'superagent-use';
import prefix from 'superagent-prefix';

export const agent = makeAgent(superagent);

const PROJECT_PROTOCOL = process.env.PROJECT_PROTOCOL || window.location.protocol.replace(':', '');
const PROJECT_HOST = process.env.PROJECT_HOST || window.location.hostname;
const PROJECT_PORT = process.env.PROJECT_PORT || window.location.port || (PROJECT_PROTOCOL === 'https' ? 443 : 80);

agent.use(prefix(`${PROJECT_PROTOCOL}://${PROJECT_HOST}:${PROJECT_PORT}/api/v1.0`));

export const setToken = (newToken        ) => {
  agent.token = newToken;
};
