import { Badge } from '@876/ui/badge'
import {
  Page,
  PageBreadcrumb,
  PageDescription,
  PageHeader,
  PageTitle,
} from '@876/ui/page'

import {
  CouponCreateForm,
  PromotionCodeCreateForm,
} from '@/components/billing-engine-settings-forms'
import { requirePagePermission } from '@/lib/auth/billing-context'
import { formatDate, formatMoney } from '@/lib/format'
import { service } from '@/lib/service'

export const metadata = { title: 'Discounts - Settings' }

export default async function DiscountsSettingsPage() {
  const context = await requirePagePermission('subscriptions:read')
  const [coupons, promotionCodes, currencies] = await Promise.all([
    service.discounts.coupons.list(context.tenant.id),
    service.discounts.promotionCodes.list(context.tenant.id),
    service.currencies.list(context.tenant.id),
  ])
  const canManage = context.permissions.includes('subscriptions:write')

  return (
    <Page>
      <PageBreadcrumb href="/settings" label="Settings" className="mb-4" />
      <PageHeader>
        <PageTitle>Discounts</PageTitle>
        <PageDescription>
          Model gifts and offers as auditable discounts instead of duplicating
          plans.
        </PageDescription>
      </PageHeader>

      <div className="space-y-8">
        <section className="space-y-4">
          <div>
            <h2 className="font-semibold text-balance">Coupons</h2>
            <p className="text-muted-foreground mt-1 text-sm text-pretty">
              Define the financial benefit and how many billing cycles it lasts.
            </p>
          </div>
          {canManage ? (
            <CouponCreateForm
              currencies={currencies.map(({ currency }) => ({
                value: currency.code,
                label: `${currency.name} (${currency.code})`,
              }))}
            />
          ) : null}
          <div className="876-card overflow-hidden">
            {coupons.length === 0 ? (
              <p className="text-muted-foreground px-5 py-10 text-center text-sm">
                No coupons created.
              </p>
            ) : (
              <div className="divide-border divide-y">
                {coupons.map((coupon) => (
                  <div
                    key={coupon.id}
                    className="flex flex-col gap-3 px-5 py-4 sm:flex-row sm:items-center"
                  >
                    <div className="min-w-0 flex-1">
                      <p className="font-medium">{coupon.name}</p>
                      <p className="text-muted-foreground mt-1 text-xs capitalize">
                        {coupon.percentOff !== null
                          ? `${coupon.percentOff}% off`
                          : formatMoney(
                              coupon.amountOff,
                              coupon.currency ?? context.tenant.defaultCurrency
                            )}
                        {' · '}
                        {coupon.duration.toLowerCase()}
                        {coupon.durationInCycles
                          ? ` for ${coupon.durationInCycles} cycles`
                          : ''}
                      </p>
                    </div>
                    <Badge variant={coupon.isActive ? 'success' : 'secondary'}>
                      {coupon.isActive ? 'Active' : 'Inactive'}
                    </Badge>
                    <span className="text-muted-foreground text-xs tabular-nums">
                      {coupon.timesRedeemed} redeemed
                    </span>
                  </div>
                ))}
              </div>
            )}
          </div>
        </section>

        <section className="space-y-4">
          <div>
            <h2 className="font-semibold text-balance">Promotion codes</h2>
            <p className="text-muted-foreground mt-1 text-sm text-pretty">
              Give customers a code that redeems an existing coupon.
            </p>
          </div>
          {canManage ? (
            <PromotionCodeCreateForm
              coupons={coupons
                .filter((coupon) => coupon.isActive)
                .map((coupon) => ({ value: coupon.id, label: coupon.name }))}
            />
          ) : null}
          <div className="876-card overflow-hidden">
            {promotionCodes.length === 0 ? (
              <p className="text-muted-foreground px-5 py-10 text-center text-sm">
                No promotion codes created.
              </p>
            ) : (
              <div className="divide-border divide-y">
                {promotionCodes.map((promotion) => (
                  <div
                    key={promotion.id}
                    className="flex flex-col gap-3 px-5 py-4 sm:flex-row sm:items-center"
                  >
                    <div className="min-w-0 flex-1">
                      <p className="font-mono font-medium">{promotion.code}</p>
                      <p className="text-muted-foreground mt-1 text-xs">
                        {promotion.coupon.name}
                        {promotion.expiresAt
                          ? ` · Expires ${formatDate(promotion.expiresAt)}`
                          : ''}
                      </p>
                    </div>
                    <Badge variant={promotion.isActive ? 'info' : 'secondary'}>
                      {promotion.isActive ? 'Active' : 'Inactive'}
                    </Badge>
                  </div>
                ))}
              </div>
            )}
          </div>
        </section>
      </div>
    </Page>
  )
}
