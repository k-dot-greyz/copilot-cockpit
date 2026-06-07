import { sanitizePrUrl } from './pr-url';
import type { PR, PRDetail } from '../github';

/**
 * Classifies a GitHub account login and account type as 'bot', 'human', or 'external'.
 */
function classifyAuthor(login: string, type: string): PR['authorType'] {
  if (type === 'Bot' || login.startsWith('app/') || login.includes('[bot]')) {
    return 'bot';
  }
  const knownHumans = ['k-dot-greyz', 'kasparsgreizis'];
  if (knownHumans.includes(login)) {
    return 'human';
  }
  return 'external';
}

/**
 * Safely parses and validates a raw GraphQL Pull Request node, mapping it to the extended PR interface.
 * Treats any malformed or missing fields defensively to prevent dashboard crashes.
 */
export function validateAndMapGraphQLPR(node: any): PR {
  if (!node || typeof node !== 'object') {
    return {
      number: 0,
      title: 'Malformed PR',
      author: 'unknown',
      authorType: 'external',
      createdAt: '',
      updatedAt: '',
      headRefName: '',
      isDraft: false,
      reviewDecision: null,
      labels: [],
      url: '#',
      checksStatus: 'none',
      mergeable: 'UNKNOWN',
      state: 'OPEN',
      commentsCount: 0,
      additions: 0,
      deletions: 0,
    };
  }

  const number = typeof node.number === 'number' ? node.number : 0;
  const title = typeof node.title === 'string' ? node.title : '';
  
  const authorNode = node.author && typeof node.author === 'object' ? node.author : null;
  const author = authorNode && typeof authorNode.login === 'string' ? authorNode.login : 'unknown';
  const authorType = classifyAuthor(author, authorNode && typeof authorNode.__typename === 'string' ? authorNode.__typename : 'User');

  const createdAt = typeof node.createdAt === 'string' ? node.createdAt : '';
  const updatedAt = typeof node.updatedAt === 'string' ? node.updatedAt : '';
  const headRefName = typeof node.headRefName === 'string' ? node.headRefName : '';
  const isDraft = typeof node.draft === 'boolean' ? node.draft : false;

  let reviewDecision: PR['reviewDecision'] = null;
  if (node.reviewDecision === 'CHANGES_REQUESTED' || node.reviewDecision === 'APPROVED' || node.reviewDecision === 'REVIEW_REQUIRED') {
    reviewDecision = node.reviewDecision;
  }

  const labels = node.labels && Array.isArray(node.labels.nodes)
    ? node.labels.nodes
        .map((l: any) => (l && typeof l.name === 'string' ? l.name : ''))
        .filter(Boolean)
    : [];

  const url = sanitizePrUrl(node.url);

  let checksStatus: PR['checksStatus'] = 'none';
  const rollupState = node.headRef?.target?.statusCheckRollup?.state;
  if (rollupState === 'SUCCESS') {
    checksStatus = 'success';
  } else if (rollupState === 'FAILURE' || rollupState === 'ERROR') {
    checksStatus = 'failure';
  } else if (rollupState === 'PENDING' || rollupState === 'EXPECTED') {
    checksStatus = 'pending';
  }

  let mergeable: PR['mergeable'] = 'UNKNOWN';
  if (node.mergeable === 'MERGEABLE' || node.mergeable === 'CONFLICTING' || node.mergeable === 'UNKNOWN') {
    mergeable = node.mergeable;
  }

  let state: PR['state'] = 'OPEN';
  if (node.state === 'OPEN' || node.state === 'CLOSED' || node.state === 'MERGED') {
    state = node.state;
  }

  const commentsCount = node.comments && typeof node.comments.totalCount === 'number' ? node.comments.totalCount : 0;
  const additions = typeof node.additions === 'number' && node.additions >= 0 ? node.additions : 0;
  const deletions = typeof node.deletions === 'number' && node.deletions >= 0 ? node.deletions : 0;

  return {
    number,
    title,
    author,
    authorType,
    createdAt,
    updatedAt,
    headRefName,
    isDraft,
    reviewDecision,
    labels,
    url,
    checksStatus,
    mergeable,
    state,
    commentsCount,
    additions,
    deletions,
  };
}

/**
 * Safely parses and validates a raw GraphQL Pull Request Detail node, mapping it to the PRDetail interface.
 * Treats any malformed or missing fields defensively to prevent detail view crashes.
 */
export function validateAndMapGraphQLPRDetail(node: any): PRDetail {
  if (!node || typeof node !== 'object') {
    return {
      number: 0,
      title: 'Malformed PR Detail',
      body: '',
      state: 'OPEN',
      draft: false,
      createdAt: '',
      updatedAt: '',
      url: '#',
      headRefName: '',
      baseRefName: '',
      additions: 0,
      deletions: 0,
      changedFiles: 0,
      mergeable: 'UNKNOWN',
      reviewDecision: null,
      author: 'unknown',
      authorAvatarUrl: '',
      commits: [],
      files: [],
      reviews: [],
      linkedIssues: [],
    };
  }

  const number = typeof node.number === 'number' ? node.number : 0;
  const title = typeof node.title === 'string' ? node.title : '';
  const body = typeof node.body === 'string' ? node.body : '';

  let state: PRDetail['state'] = 'OPEN';
  if (node.state === 'OPEN' || node.state === 'CLOSED' || node.state === 'MERGED') {
    state = node.state;
  }

  const draft = typeof node.draft === 'boolean' ? node.draft : false;
  const createdAt = typeof node.createdAt === 'string' ? node.createdAt : '';
  const updatedAt = typeof node.updatedAt === 'string' ? node.updatedAt : '';
  const url = sanitizePrUrl(node.url);
  const headRefName = typeof node.headRefName === 'string' ? node.headRefName : '';
  const baseRefName = typeof node.baseRefName === 'string' ? node.baseRefName : '';

  const additions = typeof node.additions === 'number' && node.additions >= 0 ? node.additions : 0;
  const deletions = typeof node.deletions === 'number' && node.deletions >= 0 ? node.deletions : 0;
  const changedFiles = typeof node.changedFiles === 'number' && node.changedFiles >= 0 ? node.changedFiles : 0;

  let mergeable: PRDetail['mergeable'] = 'UNKNOWN';
  if (node.mergeable === 'MERGEABLE' || node.mergeable === 'CONFLICTING' || node.mergeable === 'UNKNOWN') {
    mergeable = node.mergeable;
  }

  let reviewDecision: PRDetail['reviewDecision'] = null;
  if (node.reviewDecision === 'CHANGES_REQUESTED' || node.reviewDecision === 'APPROVED' || node.reviewDecision === 'REVIEW_REQUIRED') {
    reviewDecision = node.reviewDecision;
  }

  const authorNode = node.author && typeof node.author === 'object' ? node.author : null;
  const author = authorNode && typeof authorNode.login === 'string' ? authorNode.login : 'unknown';
  const authorAvatarUrl = authorNode && typeof authorNode.avatarUrl === 'string' ? authorNode.avatarUrl : '';

  // Parse commits
  const commits: PRDetail['commits'] = [];
  if (node.commits && Array.isArray(node.commits.nodes)) {
    node.commits.nodes.forEach((c: any) => {
      if (c && c.commit && typeof c.commit === 'object') {
        const commit = c.commit;
        commits.push({
          oid: typeof commit.oid === 'string' ? commit.oid : '',
          abbreviatedOid: typeof commit.abbreviatedOid === 'string' ? commit.abbreviatedOid : '',
          message: typeof commit.message === 'string' ? commit.message : '',
          committedDate: typeof commit.committedDate === 'string' ? commit.committedDate : '',
          authorName: commit.author && typeof commit.author.name === 'string' ? commit.author.name : 'unknown',
        });
      }
    });
  }

  // Parse files
  const files: PRDetail['files'] = [];
  if (node.files && Array.isArray(node.files.nodes)) {
    node.files.nodes.forEach((f: any) => {
      if (f && typeof f === 'object') {
        files.push({
          path: typeof f.path === 'string' ? f.path : '',
          additions: typeof f.additions === 'number' && f.additions >= 0 ? f.additions : 0,
          deletions: typeof f.deletions === 'number' && f.deletions >= 0 ? f.deletions : 0,
        });
      }
    });
  }

  // Parse reviews
  const reviews: PRDetail['reviews'] = [];
  if (node.reviews && Array.isArray(node.reviews.nodes)) {
    node.reviews.nodes.forEach((r: any) => {
      if (r && typeof r === 'object') {
        const reviewAuthorNode = r.author && typeof r.author === 'object' ? r.author : null;
        const reviewAuthor = reviewAuthorNode && typeof reviewAuthorNode.login === 'string' ? reviewAuthorNode.login : 'unknown';
        
        let reviewState: PRDetail['reviews'][0]['state'] = 'PENDING';
        if (['APPROVED', 'CHANGES_REQUESTED', 'COMMENTED', 'DISMISSED', 'PENDING'].includes(r.state)) {
          reviewState = r.state;
        }

        reviews.push({
          author: reviewAuthor,
          state: reviewState,
          body: typeof r.body === 'string' ? r.body : '',
          submittedAt: typeof r.submittedAt === 'string' ? r.submittedAt : '',
        });
      }
    });
  }

  // Parse linked issues
  const linkedIssues: PRDetail['linkedIssues'] = [];
  if (node.closingIssuesReferences && Array.isArray(node.closingIssuesReferences.nodes)) {
    node.closingIssuesReferences.nodes.forEach((issue: any) => {
      if (issue && typeof issue === 'object') {
        linkedIssues.push({
          number: typeof issue.number === 'number' ? issue.number : 0,
          title: typeof issue.title === 'string' ? issue.title : '',
          url: typeof issue.url === 'string' ? issue.url : '#',
        });
      }
    });
  }

  return {
    number,
    title,
    body,
    state,
    draft,
    createdAt,
    updatedAt,
    url,
    headRefName,
    baseRefName,
    additions,
    deletions,
    changedFiles,
    mergeable,
    reviewDecision,
    author,
    authorAvatarUrl,
    commits,
    files,
    reviews,
    linkedIssues,
  };
}
