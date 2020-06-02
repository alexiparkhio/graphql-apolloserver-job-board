import { ApolloClient, ApolloLink, HttpLink, InMemoryCache } from 'apollo-boost'
import gql from 'graphql'
import { getAccessToken, isLoggedIn } from './auth'
const endpointURL = 'http://localhost:9000/graphql';

const authLink = new ApolloLink((operation, forward) => {
  if (isLoggedIn()) {
    operation.setContext({
      headers: {
        'authorization': `Bearer ${getAccessToken()}`
      }
    })
  }
  return forward(operation);
});


const client = new ApolloClient({
  link: ApolloLink.from([
    authLink,
    new HttpLink({ uri: endpointURL }),
  ]),
  cache: new InMemoryCache()
});

const jobDetailFragment = gql`
fragment JobDetail on Job {
  id
    title
    company {
      id
      name
    }
    description
}`;

const retrieveJobsQuery = gql`query JobsQuery {
  jobs {
        id
    title
    company {
      id
      name
    }
  }
}`


const retrieveCompanyQuery = gql`query CompanyQuery ($id: ID!) {
  company(id: $id) {
    id
    name
    description
    jobs {
      id
      title
    }
  }
}`

const createJobMutation = gql`mutation CreateJob($input: CreateJobInput) {
    job: createJob(input:$input) {
      ...JobDetail
    }  
  }
  ${jobDetailFragment}
  `;

const jobQuery = gql`query JobQuery ($id: ID!) {
  jobs(id: $id) {
    ...JobDetail
  }
  ${jobDetailFragment}
}`;
export async function loadJobs() {
  const { data: { jobs } } = await client.query({ query: retrieveJobsQuery, fetchPolicy: 'no-cache' });

  return jobs;
}

export async function retrieveJob(id) {
  const { data: { job } } = await client.query({ query: jobQuery, variables: { id } });

  return job;
}

export async function retrieveCompany(id) {
  const { data: { company } } = await client.query({ query: retrieveCompanyQuery, variables: { id } });
  return company;
}

export async function createJob(input) {
  const { data: { job } } = await client.mutate({
    mutation: createJobMutation,
    variables: { input },
    update: (cache, { data }) => {
      cache.writeQuery({
        query: jobQuery,
        variables: { id: data.job.id },
        data
      })
    }
  });

  return job
}