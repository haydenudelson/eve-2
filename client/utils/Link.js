//URL for the Alliance team main repo to keep track of
const AllianceURL =
  "http://jenkins.phx.connexta.com/service/jenkins/blue/rest/organizations/jenkins/pipelines/Alliance/pipelines/master/";

//URL for the DDF team main repo to keep track of
const DDFURL =
  "http://jenkins.phx.connexta.com/service/jenkins/blue/rest/organizations/jenkins/pipelines/DDF/pipelines/master/";

//URL for the DIB team main repo to keep track of
const DIBURL =
  "http://jenkins.phx.connexta.com/service/jenkins/blue/rest/organizations/jenkins/pipelines/DIB/pipelines/master/";

//URL for the GSR team main repo to keep track of
const GSRURL =
  "http://jenkins.phx.connexta.com/service/jenkins/blue/rest/organizations/jenkins/pipelines/GSR/pipelines/master/";

//URL for the SOA-ESB team main repo to keep track of
const SOAESBURL =
  "http://jenkins.phx.connexta.com/service/jenkins/blue/rest/organizations/jenkins/pipelines/HAART-Jobs/pipelines/SOAESB_Nightly_Release_Builder/";

//URL for the REFLEX team main repo to keep track of
const REFLEXURL =
  "http://jenkins.phx.connexta.com/service/jenkins/blue/rest/organizations/jenkins/pipelines/reflex-jobs/pipelines/Nightly/pipelines/reflex-nightly/";

//URL for the ION team main repo to keep track of
export const IONURL =
  "http://jenkins.phx.connexta.com/service/jenkins/blue/rest/organizations/jenkins/pipelines/ION/";

export const jenkinsURLList = [
  { Alliance: AllianceURL },
  { DDF: DDFURL },
  { DIB: DIBURL },
  { GSR: GSRURL },
  { SOAESB: SOAESBURL },
  { REFLEX: REFLEXURL }
];

/*AF team*/

//Specific AF team Git build pipeline to keep track of
export const AFpipeline = "SOAESB_Nightly_Release_Builder";

//URL for the AF team main repo Jenkins
export const AFJenkinLink =
  "http://jenkins.phx.connexta.com/service/jenkins/job/HAART-Jobs/job/SOAESB_Nightly_Release_Builder/";

//URL for the AF team main repo to keep track of
export const AFURL =
  "http://jenkins.phx.connexta.com/service/jenkins/blue/rest/organizations/jenkins/pipelines/HAART-Jobs/pipelines/SOAESB_Nightly_Release_Builder/";

/* Grafana */
export const SOAESB_GRAFANA_URL =
  "http://haart-kube.phx.connexta.com:3000/grafana/d/6hIxKFVZk/soa_dashboard?orgId=1";
