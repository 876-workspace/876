import re
import uuid

ENTITY_PREFIXES = {
    "account": "acc",
    "address": "adr",
    "appAssignment": "asg",
    "applicationModule": "mod",
    "auditEvent": "aud",
    "apiKey": "876_app_key",
    "authProvider": "aup",
    "authorizationCode": "auc",
    "billingAccount": "ba",
    "billingCustomerEvent": "bce",
    "billingProviderObject": "bpo",
    "contact": "cnt",
    "currency": "cur",
    "customer": "cus",
    "department": "dep",
    "device": "dev",
    "email": "eml",
    "employeeProfile": "emp",
    "event": "evt",
    "feature": "ftr",
    "featureFlag": "flg",
    "featureFlagOverride": "flo",
    "featureFlagMigrationArchive": "fma",
    "financeProvisioningEvent": "fpe",
    "group": "grp",
    "importJob": "imj",
    "importJobRow": "imr",
    "importTemplate": "imt",
    "invite": "ivt",
    "invoice": "inv",
    "log": "log",
    "membership": "mem",
    "mobileNumber": "mob",
    "note": "nte",
    "notification": "ntf",
    "onboardingAnswer": "oba",
    "onboardingSession": "obs",
    "oauthGrant": "oag",
    "orgContact": "ctc",
    "orgFeature": "ofe",
    "orgLocation": "loc",
    "organization": "org",
    "permission": "per",
    "plan": "pln",
    "planModule": "pmo",
    "price": "prc",
    "product": "prd",
    "refreshToken": "ort",
    "registeredApp": "rap",
    "provisioningManifest": "pm",
    "provisioningRevision": "pmr",
    "provisioningResource": "prs",
    "provisioningProperty": "prp",
    "provisioningStep": "pst",
    "provisioningNote": "pnt",
    "provisioningRun": "prn",
    "provisioningRunStep": "prst",
    "record": "rec",
    "request": "req",
    "role": "rol",
    "session": "ses",
    "socialPlatform": "sop",
    "ssoConnection": "sco",
    "ssoIdentity": "ssi",
    "subscription": "sub",
    "subscriptionItem": "sbi",
    "team": "tem",
    "ticket": "tkt",
    "user": "user",
    "userAppEnrollment": "uae",
    "userFeature": "ufe",
    "userProfile": "upr",
    "userSocialProfile": "usp",
}


def generate_id(entity_type: str) -> str:
    prefix = ENTITY_PREFIXES.get(entity_type)
    if not prefix:
        raise ValueError(f"Unknown entity type: {entity_type}")
    uuid_str = uuid.uuid4().hex
    return f"{prefix}_{uuid_str}"


def generate_platform_owner_user_id() -> str:
    return generate_id("user").replace("user_", "876_", 1)


def normalize_slug(slug: str) -> str:
    s = slug.lower().strip()
    s = re.sub(r"[^a-z0-9-]", "-", s)
    s = re.sub(r"-+", "-", s)
    return s.strip("-")
