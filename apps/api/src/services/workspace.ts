import { WORK_CRM_INTEGRATION_SCOPES } from '@876/work'
import { create876WorkOperatorClient } from '@876/work/operator'
import { getSettings } from '@/config'
import { getLogger } from '@/platform/logger'
import { nowUnixSeconds } from '@/platform/timestamps'
import { assignMemberApps, ensureOrgAppsFinanceReady, linkMembershipRole, provisionOrganization, WORK_DEPENDENT_APP_SLUGS } from './provisioning'
import * as provisioningRepository from './provisioning.repository'
const log = getLogger('workspace')
function scopesForWorkConsumer(slug: string) {
  if (slug === '876-crm') return WORK_CRM_INTEGRATION_SCOPES
  return [] as const
}
export const workspace = {
  async setup(organizationId:string,options:{sourceAppId?:string|null;finance?:'ready'|'defer';now?:number}={}){return provisionOrganization(organizationId,options.now??nowUnixSeconds(),{sourceAppId:options.sourceAppId??null,deferFinanceReadiness:options.finance==='defer'})},
  apps:{assign(params:{organizationId:string;userId:string;sourceAppId?:string|null;assignedBy?:string|null;now?:number}){return assignMemberApps({...params,now:params.now??nowUnixSeconds()})}},
  roles:{link(membership:{id:string;organizationId:string;role:string;roleId:string|null},now=nowUnixSeconds()){return linkMembershipRole(membership,now)}},
  finance:{ensure(params:{organizationId:string;appIds?:string[]}){return ensureOrgAppsFinanceReady(params.organizationId,params.appIds?{appIds:params.appIds}:{})}},
  work:{async ensure(params:{organizationId:string;appIds?:string[]}):Promise<void>{const settings=getSettings();const url=settings.work.url.trim();const internalKey=settings.work.internalKey.trim();if(!url||!internalKey){log.warn({organization_id:params.organizationId,has_work_api_url:Boolean(url),has_work_internal_key:Boolean(internalKey)},'work_provisioning.not_configured');return}const appIds=params.appIds??(await provisioningRepository.listSubscribedAppIds(params.organizationId));const work=create876WorkOperatorClient({baseUrl:url,internalKey});for(const slug of WORK_DEPENDENT_APP_SLUGS){const app=await provisioningRepository.findAppBySlug(slug);if(!app){log.warn({organization_id:params.organizationId,app_slug:slug},'work_provisioning.app_not_found');continue}if(!appIds.includes(app.id))continue;const scopes=scopesForWorkConsumer(slug);if(!scopes.length){log.warn({organization_id:params.organizationId,app_slug:slug},'work_provisioning.no_scope_grant');continue}try{const result=await work.workspace.ensure(params.organizationId,{appId:app.id,scopes});if(result.error)log.error({organization_id:params.organizationId,app_id:app.id,error_code:result.error.code},'work_provisioning.failed')}catch(error){log.error({err:error,organization_id:params.organizationId,app_id:app.id},'work_provisioning.failed')}}}}
} as const
