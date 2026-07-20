"""SQLAlchemy models, grouped by domain. Import surface is unchanged:

``from db.models import User`` keeps working — every model is re-exported
here, and importing this package registers all mappers on the shared Base.
"""

from db.models.apps import (
    ApiKey,
    App,
    AppAssignment,
    UserAppEnrollment,
)
from db.models.audit import AuditEvent
from db.models.auth import (
    AuthEmailOtpChallenge,
    AuthorizationCode,
    AuthProvider,
    InviteToken,
    OauthGrant,
    OauthRefreshToken,
    Session,
    SsoConnection,
    SsoIdentity,
    Verification,
)
from db.models.base import Base
from db.models.billing_accounts import BillingAccount
from db.models.billing_customer_sync import BillingCustomerOutbox
from db.models.billing_provider_objects import BillingProviderObject
from db.models.contacts import (
    Address,
    Contact,
    SocialPlatform,
    UserContact,
    UserSocialProfile,
)
from db.models.directory import (
    Bank,
    BankAccount,
    BankBranch,
    CreditUnion,
    CreditUnionBranch,
    DirectoryAddress,
    Ministry,
    MinistryDepartment,
    SecondarySchool,
    University,
    UniversityCampus,
)
from db.models.feature_migrations import FeatureFlagMigrationArchive
from db.models.features import Feature, OrgFeature, UserFeature
from db.models.finance_provisioning import FinanceProvisioningOutbox
from db.models.geo import Country, Currency, Region
from db.models.modules import ApplicationModule, PlanModule
from db.models.onboarding import OnboardingAnswer, OnboardingSession
from db.models.orgs import (
    EmployeeProfile,
    Membership,
    Organization,
    OrganizationRole,
    OrgContact,
    OrgDepartment,
    OrgLocation,
)
from db.models.prices import Price
from db.models.products import Product
from db.models.provisioning import (
    ProvisioningManifest,
    ProvisioningManifestRevision,
    ProvisioningNote,
    ProvisioningProperty,
    ProvisioningResource,
    ProvisioningRun,
    ProvisioningRunStep,
    ProvisioningStep,
)
from db.models.subscription_items import SubscriptionItem
from db.models.subscriptions import Subscription
from db.models.taxes import TaxCode, TaxRate
from db.models.users import (
    Account,
    ReservedUsername,
    User,
    UserEmail,
    UserIdentification,
    UserMobileNumber,
    UserProfile,
)

__all__ = [
    "Account",
    "Address",
    "ApiKey",
    "App",
    "AppAssignment",
    "ApplicationModule",
    "AuditEvent",
    "AuthEmailOtpChallenge",
    "AuthProvider",
    "AuthorizationCode",
    "Bank",
    "BankAccount",
    "BankBranch",
    "Base",
    "BillingAccount",
    "BillingCustomerOutbox",
    "BillingProviderObject",
    "Contact",
    "Country",
    "CreditUnion",
    "CreditUnionBranch",
    "Currency",
    "DirectoryAddress",
    "EmployeeProfile",
    "Feature",
    "FeatureFlagMigrationArchive",
    "FinanceProvisioningOutbox",
    "InviteToken",
    "Membership",
    "Ministry",
    "MinistryDepartment",
    "OauthGrant",
    "OauthRefreshToken",
    "OnboardingAnswer",
    "OnboardingSession",
    "OrgContact",
    "OrgDepartment",
    "OrgFeature",
    "OrgLocation",
    "Organization",
    "OrganizationRole",
    "PlanModule",
    "Price",
    "Product",
    "ProvisioningManifest",
    "ProvisioningManifestRevision",
    "ProvisioningNote",
    "ProvisioningProperty",
    "ProvisioningResource",
    "ProvisioningRun",
    "ProvisioningRunStep",
    "ProvisioningStep",
    "Region",
    "ReservedUsername",
    "SecondarySchool",
    "Session",
    "SocialPlatform",
    "SsoConnection",
    "SsoIdentity",
    "Subscription",
    "SubscriptionItem",
    "TaxCode",
    "TaxRate",
    "University",
    "UniversityCampus",
    "User",
    "UserAppEnrollment",
    "UserContact",
    "UserEmail",
    "UserFeature",
    "UserIdentification",
    "UserMobileNumber",
    "UserProfile",
    "UserSocialProfile",
    "Verification",
]
