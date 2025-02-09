import React from "react";
import styled from "styled-components";
import {
  List,
  ListItem,
  ListItemIcon,
  MobileStepper,
  Button
} from "@material-ui/core";
import { withStyles } from "@material-ui/core/styles";
import { CX_GRAY_BLUE, CX_OFF_WHITE } from "../utils/Constants.js";
import { BoxStyle, BoxHeader, BOX_HEADER_SIZE } from "../styles/styles";
import PullRequest from "../../resources/pullRequest.png";
import { getRelativeTime, hour, time } from "../utils/TimeUtils";
import makeTrashable from "trashable";
import { addS } from "../utils/TimeUtils";

import NeutralState from "@material-ui/icons/Remove";
import BadState from "@material-ui/icons/Clear";
import GoodState from "@material-ui/icons/Done";
import KeyboardArrowLeft from "@material-ui/icons/KeyboardArrowLeft";
import KeyboardArrowRight from "@material-ui/icons/KeyboardArrowRight";

export const GITHUB_HEIGHT = 400;

const MAXPULLS = 5; // Max number of pull requests to display
const NUM_STATUSES = 2; // Max number of statuses to display for each PR
const REQ_APPROVALS = 2; // Required number of approvals for a given PR
const CALL_FREQ = hour; // Frequency to refresh GitHub data
const ROTATE_FREQ = time({ seconds: 10 }); // Frequency to rotate displayed PR
const IGNORE_CONTEXTS = ["snyk", "license/cla"]; // list of contexts to ignore for statuses

const CLIENT_ID = process.env.GITHUB_CLIENT_ID;
const CLIENT_SECRET = process.env.GITHUB_CLIENT_SECRET;

const GithubCard = styled(BoxStyle)`
  height: ${GITHUB_HEIGHT}px;
`;

const Header = styled(BoxHeader)`
  width: 100%;
`;

const CardContent = styled.div`
  height: calc(100% - ${BOX_HEADER_SIZE}px - 32px);
  width: 100%;
  float: left;
`;

const MainAndSubline = styled.div`
  display: inline-block;
  width: 100%;
  cursor: pointer;
`;

const PRTitle = styled.span`
  text-decoration: bold;
`;

const PRNumber = styled.em`
  color: ${CX_GRAY_BLUE};
  vertical-align: "bottom";
`;

const PRSubline = styled.div`
  font-style: italic;
`;

const Description = styled.p`
  margin: 0 0 0 0;
  max-height: 48px;
  display: -webkit-box;
  -webkit-line-clamp: 2;
  -webkit-box-orient: vertical;
  overflow: hidden;
`;

const Icon = styled.img`
  height: 20px;
  margin-left: 4px;
`;

const LinkText = styled.span`
  text-decoration: underline;
  cursor: pointer;
`;

const StyledMobileStepper = withStyles({
  root: {
    backgroundColor: CX_OFF_WHITE,
    height: "20px",
    width: "calc(100% - 20px)"
  },
  dotActive: {
    backgroundColor: CX_GRAY_BLUE
  }
})(MobileStepper);

// Returns either GoodState or NeutralState depending on num approvals
function Approvals(props) {
  return props.approvals >= REQ_APPROVALS ? <GoodState /> : <NeutralState />;
}

// Displays statuses below PR header
// statuses: array of statuses, each with a description, context, state, and link
function Statuses(props) {
  let statuses = [];
  let max =
    props.statuses.length > NUM_STATUSES
      ? NUM_STATUSES - 1
      : props.statuses.length;
  for (let i = 0; i < max; i++) {
    let icon = <NeutralState />;
    if (
      props.statuses[i].state == "failure" ||
      props.statuses[i].state == "error"
    )
      icon = <BadState />;
    else if (props.statuses[i].state == "success") icon = <GoodState />;

    statuses.push(
      props.statuses[i].link ? (
        <ListItem
          key={i}
          disableGutters={true}
          onClick={() => window.open(props.statuses[i].link)}
        >
          <ListItemIcon key={i}>{icon}</ListItemIcon>
          <LinkText>
            {props.statuses[i].context}: {props.statuses[i].description}
          </LinkText>
        </ListItem>
      ) : (
        <ListItem key={i} disableGutters={true}>
          <ListItemIcon key={i}>{icon}</ListItemIcon>
          {props.statuses[i].context}: {props.statuses[i].description}
        </ListItem>
      )
    );
  }
  if (props.statuses.length > NUM_STATUSES) {
    statuses.push(
      <ListItem
        disableGutters={true}
        key={NUM_STATUSES}
        onClick={() => window.open(props.url)}
      >
        + {props.statuses.length - (NUM_STATUSES - 1)} statuses not shown
      </ListItem>
    );
  }

  return statuses;
}

// repoPath: the path to the desired repo (":org/:repo")
export default class Github extends React.Component {
  constructor(props) {
    super(props);

    this.state = {
      prs: [],
      name: null,
      displayIndex: 0,
      numPulls: MAXPULLS
    };

    this.getRepoName();
  }

  // Function to make class to GitHub API, trashable used to protect against broken promises
  async fetchGithub(call) {
    this.trashableRequestGithub = makeTrashable(fetch(call));

    return await this.trashableRequestGithub
      .catch(e => console.log("Error fetching GitHub data", e))
      .then(res => {
        if (!res.ok) {
          console.log("Failed to fetch GitHub data: " + call);
          return;
        } else {
          return res.json();
        }
      })
      .then(res => {
        return res;
      });
  }

  // Finds and sets name of repo
  async getRepoName() {
    let call =
      "https://api.github.com/repos/" +
      this.props.repoPath +
      "?client_secret=" +
      CLIENT_SECRET +
      "&client_id=" +
      CLIENT_ID;
    let name = (await this.fetchGithub(call)).name.toUpperCase();
    this.setState({ name: name });
  }

  // Gets review data for a given PR and returns num of approvals
  async getApprovals(prNum) {
    let call =
      "https://api.github.com/repos/" +
      this.props.repoPath +
      "/pulls/" +
      prNum +
      "/reviews";
    let reviews = await this.fetchGithub(call);
    let sum = 0;
    for (let i = 0; i < reviews.length; i++) {
      if (reviews[i].state == "APPROVED") sum++;
    }
    return sum;
  }

  // Gets status data for a given PR and returns latest status for each given context
  async getStatuses(url) {
    let statuses = await this.fetchGithub(url);
    statuses = statuses.map(st => {
      return {
        description: st.description,
        context: st.context,
        state: st.state,
        link: null
      };
    });

    let unique = {};

    for (let i = 0; i < statuses.length; i++) {
      if (IGNORE_CONTEXTS.some(e => statuses[i].context.includes(e))) continue;

      if (!unique[statuses[i].context]) {
        let start = statuses[i].description.indexOf("http");
        if (start >= 0) {
          let end = statuses[i].description.indexOf(" ", start);
          statuses[i].link = statuses[i].description.substring(start, end);
          statuses[i].description = statuses[i].description.replace(
            statuses[i].link,
            ""
          );
        }
        unique[statuses[i].context] = statuses[i];
      }
    }

    return Object.values(unique);
  }

  // Formats given PR description for display
  formatDescription(desc) {
    let tag = "What does this PR do?";
    let start = desc.indexOf(tag);
    if (start >= 0) {
      let end = desc.indexOf("\r\n", start + tag.length + 2);
      return desc.substring(start + tag.length + 1, end);
    } else {
      let end = desc.indexOf("\r\n");
      return desc.substring(0, end);
    }
  }

  // Calls GitHub to fetch PR, status, and review data & stores in this.state.pulls
  async loadUserData() {
    let call = "https://api.github.com/repos/" + this.props.repoPath + "/pulls";
    let data = await this.fetchGithub(call);

    let pulls = [];
    this.setState({
      numPulls: data.length >= MAXPULLS ? MAXPULLS : data.length
    });

    for (let i = 0; i < this.state.numPulls; i++) {
      let approvals = await this.getApprovals(data[i].number);
      let statuses = await this.getStatuses(data[i].statuses_url);
      let description = this.formatDescription(data[i].body);

      pulls[i] = {
        author: data[i].user.login,
        number: data[i].number,
        title: data[i].title,
        description: description,
        timeCreated: getRelativeTime(new Date(data[i].created_at)),
        url: data[i].html_url,
        approvals: approvals,
        statuses: statuses
      };
    }

    this.setState({ prs: pulls });
  }

  // Increments which PR to display
  rotatePR() {
    this.setState({
      displayIndex:
        this.state.displayIndex == this.state.numPulls - 1
          ? 0
          : this.state.displayIndex + 1
    });
  }

  // Manually changes which PR to display, resets timer
  switchPR(i) {
    if (i >= this.state.numPulls) i = 0;
    if (i < 0) i = this.state.numPulls - 1;
    this.setState({ displayIndex: i });
    clearInterval(this.rotateInterval);
    this.rotateInterval = setInterval(() => this.rotatePR(), ROTATE_FREQ);
  }

  // Gets user data and sets timer for refreshing data and rotating displayed PR
  componentDidMount() {
    this.loadUserData();
    this.interval = setInterval(() => this.loadUserData(), CALL_FREQ);
    this.rotateInterval = setInterval(() => this.rotatePR(), ROTATE_FREQ);
  }

  // Clears interval and destroys remaining promises when component unmounted
  componentWillUnmount() {
    clearInterval(this.interval);
    clearInterval(this.rotateInterval);
    if (this.trashableRequestGithub) this.trashableRequestGithub.trash();
  }

  render() {
    if (this.state.prs.length == 0)
      return (
        <GithubCard raised={true}>
          <Header>{this.state.name} Pull Requests</Header>
          <CardContent>No pull requests</CardContent>
        </GithubCard>
      );
    else {
      let pr = this.state.prs[this.state.displayIndex];
      let desc =
        pr.description.length > 4 ? (
          <ListItem disableGutters={true}>
            <ListItemIcon>
              <Icon src={PullRequest} />
            </ListItemIcon>
            <Description>{pr.description}</Description>
          </ListItem>
        ) : null;

      return (
        <GithubCard raised={true}>
          <Header>{this.state.name} Pull Requests</Header>
          <CardContent>
            <MainAndSubline onClick={() => window.open(pr.url)}>
              <PRTitle>
                <PRNumber>{" #" + pr.number}</PRNumber> {pr.title}
              </PRTitle>
              <PRSubline>
                Created {pr.timeCreated} by {pr.author}
              </PRSubline>
            </MainAndSubline>
            <List>
              {desc}
              <ListItem disableGutters={true}>
                <ListItemIcon>
                  <Approvals approvals={pr.approvals} />
                </ListItemIcon>
                {pr.approvals} approval
                {addS(pr.approvals)}
              </ListItem>
              <Statuses statuses={pr.statuses} url={pr.url} />
            </List>
          </CardContent>
          <StyledMobileStepper
            activeStep={this.state.displayIndex}
            steps={this.state.numPulls}
            variant={"dots"}
            position={"static"}
            nextButton={
              <Button
                size="small"
                onClick={() => this.switchPR(this.state.displayIndex + 1)}
              >
                Next
                <KeyboardArrowRight />
              </Button>
            }
            backButton={
              <Button
                size="small"
                onClick={() => this.switchPR(this.state.displayIndex - 1)}
              >
                <KeyboardArrowLeft />
                Back
              </Button>
            }
          />
        </GithubCard>
      );
    }
  }
}
