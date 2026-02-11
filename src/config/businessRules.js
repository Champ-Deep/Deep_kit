const BUSINESSES = [
  {id: 'lakeb2b', name: 'LakeB2B', keywords: ['enterprise', 'sales', 'b2b'], notionWorkspace: process.env.NOTION_WORKSPACE_LAKEB2B},
  {id: 'ampliz', name: 'Ampliz', keywords: ['healthcare', 'medical', 'hipaa'], notionWorkspace: process.env.NOTION_WORKSPACE_AMPLIZ},
  {id: 'champions_accelerator', name: 'Champions Accelerator', keywords: ['founder', 'startup', 'fundraising'], notionWorkspace: process.env.NOTION_WORKSPACE_CHAMPIONS_ACCELERATOR},
  {id: 'champions_group', name: 'Champions Group', keywords: ['events', 'venue', 'hospitality'], notionWorkspace: process.env.NOTION_WORKSPACE_CHAMPIONS_GROUP},
  {id: 'recruitchamp', name: 'RecruitChamp', keywords: ['hiring', 'recruitment', 'ats'], notionWorkspace: process.env.NOTION_WORKSPACE_RECRUITCHAMP},
  {id: 'metricfox', name: 'MetricFox', keywords: ['marketing', 'roi', 'attribution'], notionWorkspace: process.env.NOTION_WORKSPACE_METRICFOX},
  {id: 'ipmomentum', name: 'IP Momentum', keywords: ['voip', 'cti', 'rcs'], notionWorkspace: process.env.NOTION_WORKSPACE_IP_MOMENTUM}
];
const THRESHOLDS = {primary: 7, secondary: 4};
module.exports = {BUSINESSES, THRESHOLDS};
