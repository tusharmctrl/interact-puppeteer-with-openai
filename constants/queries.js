export const ASSESSMENT_INSERTION = `mutation InsertURLOne($object: qx_url_insert_input!) {
    insert_qx_url_one(object: $object) {
      id
      assessments {
        id
      }
    }
  }
  `;

export const INSERT_JOURNEY = `mutation InsertJourney($objects:[qx_journey_insert_input!]! ) {
    insert_qx_journey(objects: $objects) {
      affected_rows
    }
  }`;

export const INSERT_PERFORMANCE_AND_ACCESSIBILITY = `mutation InsertPerformanceAndAccessibilityAssessment($performanceObjects: [qx_performance_assessment_insert_input!]!, $accessibilityObjects: [qx_accessibility_assessment_insert_input!]!) {
  insert_qx_performance_assessment(objects: $performanceObjects) {
    affected_rows
  }
  insert_qx_accessibility_assessment(objects: $accessibilityObjects) {
    affected_rows
  }
}
`;

export const UPDATE_STATUS = `mutation UpdateStatus($status: String!, $endTime: timestamp) {
  update_qx_assessments(where: {status: {_eq: $status}}, _set: {status: $status,  completed_at: $endTime}) {
    affected_rows
  }
}`;
