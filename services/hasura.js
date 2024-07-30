import axios from "axios";

const graphqlEndpoint = "https://g.staging.qxlab.app/v1/graphql";

/**
 * Executes a GraphQL query or mutation
 * @param {string} query - The GraphQL query or mutation string
 * @param {object} variables - An object containing the variables for the query or mutation
 * @returns {Promise} - A promise that resolves to the response data
 */
export const executeGraphQL = async (query, variables = {}) => {
  try {
    const response = await axios.post(
      graphqlEndpoint,
      {
        query: query,
        variables: variables,
      },
      {
        headers: {
          "Content-Type": "application/json",
          "x-hasura-admin-secret": `${process.env.HASURA_ADMIN_SECRET}`,
        },
      }
    );

    return response.data;
  } catch (error) {
    console.error("GraphQL request error:", error);
    throw error;
  }
};
