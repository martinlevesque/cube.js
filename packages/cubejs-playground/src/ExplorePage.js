/* global window */
import React, { Component } from 'react';
import cubejs from '@cubejs-client/core';
import { CubeProvider } from '@cubejs-client/react';
import { fetch } from 'whatwg-fetch';
import PropTypes from 'prop-types';
import DashboardSource from './DashboardSource';
import PlaygroundQueryBuilder from './PlaygroundQueryBuilder';

class ExplorePage extends Component {
  constructor(props) {
    super(props);
    this.state = {};
    this.dashboardSource = new DashboardSource();
  }

  async componentDidMount() {
    const res = await fetch('/playground/context');
    const result = await res.json();

    const basePath = result.basePath || '/cubejs-api';
    let apiUrl = result.apiUrl || window.location.href.split('#')[0].replace(/\/$/, '');
    apiUrl = `${apiUrl}${basePath}/v1`;

    this.setState({
      cubejsToken: result.cubejsToken,
      apiUrl
    });

    window['__cubejsPlayground'] = {
      ...window['__cubejsPlayground'],
      apiUrl,
      token: result.cubejsToken
    };
  }

  cubejsApi() {
    const { cubejsToken, apiUrl } = this.state;
    if (!this.cubejsApiInstance && cubejsToken) {
      this.cubejsApiInstance = cubejs(cubejsToken, {
        apiUrl
      });
    }
    return this.cubejsApiInstance;
  }

  render() {
    const { cubejsToken, apiUrl } = this.state;
    const { location, history } = this.props;
    const params = new URLSearchParams(location.search);
    const query =
      (params.get('query') && JSON.parse(params.get('query'))) || {};
    return (
      (this.cubejsApi() && (
        <CubeProvider cubejsApi={this.cubejsApi()}>
          <PlaygroundQueryBuilder
            query={query}
            setQuery={(q) => history.push(`/build?query=${JSON.stringify(q)}`)}
            cubejsApi={this.cubejsApi()}
            apiUrl={apiUrl}
            cubejsToken={cubejsToken}
            dashboardSource={this.dashboardSource}
          />
        </CubeProvider>
      )) ||
      null
    );
  }
}

ExplorePage.propTypes = {
  location: PropTypes.object.isRequired,
  history: PropTypes.object.isRequired,
};

export default ExplorePage;
