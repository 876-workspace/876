import {
  canonicalizeJson,
  idempotencyHash,
  integrationPayloadHash,
} from '../idempotency'

const fixtures = [
  {
    source: 'null',
    canonical: 'null',
    hash: '74234e98afe7498fb5daf1f36ac2d78acc339464f950703b8c019892f982b90b',
  },
  {
    source: '[true,false,"876",1,1.0,-0,-0.0]',
    canonical:
      'array:[boolean:true,boolean:false,string:"876",number:1,number:1.0,number:0,number:-0.0]',
    hash: '36476f6f4ef0367e058d9ce586db4937942ab35816198c65dcac6c3235818ccb',
  },
  {
    source: '{"z":1e20,"a":1e-7,"m":0.0001}',
    canonical: 'object:{"a":number:1e-07,"m":number:0.0001,"z":number:1e+20}',
    hash: '0d9568b106807bded312807ae3461320659660290f22a1aff1030c97cab7f1ea',
  },
  {
    source:
      '{"payload":{"é":"café","😀":"ok"},"sourceExternalReference":"é-1"}',
    canonical:
      'object:{"payload":object:{"\\u00e9":string:"caf\\u00e9","\\ud83d\\ude00":string:"ok"},"sourceExternalReference":string:"\\u00e9-1"}',
    hash: 'c514fe51c4e2a52232519b11b91b27f79236b818bd6037b16c4124e82b88ea4e',
  },
  {
    source: '{"b":{"y":[3,{"q":null}],"x":2},"a":"external_123"}',
    canonical:
      'object:{"a":string:"external_123","b":object:{"x":number:2,"y":array:[number:3,object:{"q":null}]}}',
    hash: '865eec88c7e9f5a8dfb6cea55c6b78f8b0c7437260f4527e7e7bb8210658073a',
  },
] as const

describe('Python-compatible idempotency canonicalization', () => {
  it.each(fixtures)(
    'matches the Python bytes and digest for $source',
    (fixture) => {
      expect(canonicalizeJson(fixture.source)).toBe(fixture.canonical)
      expect(idempotencyHash(fixture.source)).toBe(fixture.hash)
    }
  )

  it('sorts reordered objects to the same representation', () => {
    expect(canonicalizeJson('{"second":2,"first":1}')).toBe(
      canonicalizeJson('{"first":1,"second":2}')
    )
  })

  it('rejects unsupported non-JSON numeric values', () => {
    expect(() => canonicalizeJson('{"amount":NaN}')).toThrow(
      'The integration payload contains invalid JSON.'
    )
  })

  it.each([
    {
      source:
        '{"name":"Ana","sourceExternalReference":"ext_1","quantity":1.0,"sourceAppId":"evil"}',
      hash: 'ae83817b27aa63a05f3bbe67b0633cb4c0c12c3b3b42a24395ff786e6f635c00',
    },
    {
      source:
        '{"sourceExternalReference":null,"nested":{"é":"😀","amount":1e-7}}',
      hash: 'c683426c2009a04d57f2d3870724917f064e3cf3943fd151228970aaae62ca02',
    },
  ])(
    'matches Python integration attribution for $source',
    ({ source, hash }) => {
      expect(integrationPayloadHash(source)).toBe(hash)
    }
  )
})
