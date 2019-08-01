import {
    ObjectTypeDefinitionNode, parse, FieldDefinitionNode, DocumentNode,
    DefinitionNode, Kind, InputObjectTypeDefinitionNode,
    InputValueDefinitionNode
} from 'graphql'
import GraphQLTransform, { Transformer, InvalidDirectiveError } from 'graphql-transformer-core'
import { ResourceConstants, ResolverResourceIDs, ModelResourceIDs } from 'graphql-transformer-common'
import RelationTransformer from '../ModelRelationTransformer'
import DynamoDBModelTransformer from 'graphql-dynamodb-transformer'
import KeyTransformer from 'graphql-key-transformer'

test('RelationTransformer should fail if relation was called on an object that is not a Model type.', () => {
    const validSchema = `
    type Test {
        id: ID!
        email: String!
        testObj: Test1 @relation(fields: ["email"])
    }

    type Test1 @model {
        id: ID!
        name: String!
    }
    `

    const transformer = new GraphQLTransform({
        transformers: [
            new DynamoDBModelTransformer(),
            new RelationTransformer(),
        ]
    })

    expect(() => transformer.transform(validSchema)).toThrowError(`Object type Test must be annotated with @model.`);
})

test('RelationTransformer should fail if relation was with an object that is not a Model type.', () => {
    const validSchema = `
    type Test @model {
        id: ID!
        email: String!
        testObj: Test1 @relation(fields: ["email"])
    }

    type Test1 {
        id: ID!
        name: String!
    }
    `

    const transformer = new GraphQLTransform({
        transformers: [
            new DynamoDBModelTransformer(),
            new RelationTransformer()
        ]
    })

    expect(() => transformer.transform(validSchema)).toThrowError(`Object type Test1 must be annotated with @model.`);
})

test('RelationTransformer should fail if the field type where the directive is called is incorrect.', () => {
    const validSchema = `
    type Test @model {
        id: ID!
        email: String!
        testObj: Test2 @relation(fields: ["email"])
    }

    type Test1 @model {
        id: iD!
        name: String!
    }
    `

    const transformer = new GraphQLTransform({
        transformers: [
            new DynamoDBModelTransformer(),
            new RelationTransformer()
        ]
    })

    expect(() => transformer.transform(validSchema)).toThrowError('Type "Test2" not found in document.');
})

test('RelationTransformer should fail if an empty list of fields is passed in.', () => {
    const validSchema = `
    type Test @model {
        id: ID!
        email: String
        testObj: Test1 @relation(fields: [])
    }

    type Test1 @model {
        id: ID!
        name: String!
    }
    `

    const transformer = new GraphQLTransform({
        transformers: [
            new DynamoDBModelTransformer(),
            new RelationTransformer()
        ]
    })

    expect(() => transformer.transform(validSchema)).toThrowError('No fields passed in to @relation directive.');
})

test('RelationTransformer should fail if any of the fields passed in are not in the Parent model.', () => {
    const validSchema = `
    type Test @model {
        id: ID!
        email: String
        testObj: [Test1] @relation(fields: ["id", "name"])
    }

    type Test1
        @model
        @key(fields: ["id", "name"])
    {
        id: ID!
        friendID: ID!
        name: String!
    }
    `

    const transformer = new GraphQLTransform({
        transformers: [
            new DynamoDBModelTransformer(),
            new KeyTransformer(),
            new RelationTransformer()
        ]
    })

    expect(() => transformer.transform(validSchema)).toThrowError('name is not a field in Test');
})

test('RelationTransformer should fail if the query is not run on the default table when relation is trying to connect a single object.', () => {
    const validSchema = `
    type Test @model {
        id: ID!
        email: String
        testObj: Test1 @relation(index: "notDefault", fields: ["id"])
    }

    type Test1
        @model
        @key(name: "notDefault", fields: ["friendID"])
    {
        id: ID!
        friendID: ID!
        name: String!
    }
    `

    const transformer = new GraphQLTransform({
        transformers: [
            new DynamoDBModelTransformer(),
            new KeyTransformer(),
            new RelationTransformer()
        ]
    })

    expect(() =>
        transformer.transform(validSchema)).toThrowError('Relation is to a single object but the query index is not the default.')
})

test('RelationTransformer should fail if index provided does not exist.', () => {
    const validSchema = `
    type Test @model {
        id: ID!
        email: String
        testObj: [Test1] @relation(index: "notDefault", fields: ["id"])
    }

    type Test1 @model {
        id: ID!
        friendID: ID!
        name: String!
    }
    `

    const transformer = new GraphQLTransform({
        transformers: [
            new DynamoDBModelTransformer(),
            new RelationTransformer()
        ]
    })

    expect(() =>
        transformer.transform(validSchema)).toThrowError('Index notDefault does not exist for model Test1')
})

test('RelationTransformer should fail if first field does not match PK of table. (When using default table)', () => {
    const validSchema = `
    type Test @model {
        id: ID!
        email: String!
        testObj: Test1 @relation(fields: ["email"])
    }

    type Test1 @model {
        id: ID!
        friendID: ID!
        name: String!
    }
    `

    const transformer = new GraphQLTransform({
        transformers: [
            new DynamoDBModelTransformer(),
            new RelationTransformer()
        ]
    })

    expect(() =>
        transformer.transform(validSchema)).toThrowError('email field is not of type ID')
})

test('RelationTransformer should fail if sort key type passed in does not match default table sort key type.', () => {
    const validSchema = `
    type Test @model {
        id: ID!
        email: String!
        testObj: [Test1] @relation(fields: ["id", "email"])
    }

    type Test1
        @model
        @key(fields: ["id", "friendID"])
    {
        id: ID!
        friendID: ID!
        name: String!
    }
    `

    const transformer = new GraphQLTransform({
        transformers: [
            new DynamoDBModelTransformer(),
            new KeyTransformer(),
            new RelationTransformer()
        ]
    })

    expect(() => transformer.transform(validSchema)).toThrowError('email field is not of type ID');
})

test('RelationTransformer should fail if sort key type passed in does not match custom index sort key type.', () => {
    const validSchema = `
    type Test @model {
        id: ID!
        email: String!
        testObj: [Test1] @relation(index: "testIndex", fields: ["id", "email"])
    }

    type Test1
        @model
        @key(name: "testIndex", fields: ["id", "friendID"])
    {
        id: ID!
        friendID: ID!
        name: String!
    }
    `

    const transformer = new GraphQLTransform({
        transformers: [
            new DynamoDBModelTransformer(),
            new KeyTransformer(),
            new RelationTransformer()
        ]
    })

    expect(() => transformer.transform(validSchema)).toThrowError('email field is not of type ID');
})

test('RelationTransformer should fail if partition key type passed in does not match custom index partition key type.', () => {
    const validSchema = `
    type Test @model {
        id: ID!
        email: String!
        testObj: [Test1] @relation(index: "testIndex", fields: ["email", "id"])
    }

    type Test1
        @model
        @key(name: "testIndex", fields: ["id", "friendID"])
    {
        id: ID!
        friendID: ID!
        name: String!
    }
    `

    const transformer = new GraphQLTransform({
        transformers: [
            new DynamoDBModelTransformer(),
            new KeyTransformer(),
            new RelationTransformer()
        ]
    })

    expect(() => transformer.transform(validSchema)).toThrowError('email field is not of type ID');
})

test('Test RelationTransformer for One-to-One getItem case.', () => {
    const validSchema = `
    type Test @model {
        id: ID!
        email: String!
        otherHalf: Test1 @relation(fields: ["id", "email"])
    }

    type Test1
        @model
        @key(fields: ["id", "email"])
    {
        id: ID!
        friendID: ID!
        email: String!
    }
    `

    const transformer = new GraphQLTransform({
        transformers: [
            new DynamoDBModelTransformer(),
            new KeyTransformer(),
            new RelationTransformer()
        ]
    })

    const out = transformer.transform(validSchema);
    expect(out).toBeDefined();
    expect(out.stacks.Test.Resources[ResolverResourceIDs.ResolverResourceID('Test', 'otherHalf')]).toBeTruthy();
    const schemaDoc = parse(out.schema);

    const testObjType = getObjectType(schemaDoc, 'Test');
    expectFields(testObjType, ['otherHalf']);
    const relatedField = testObjType.fields.find(f => f.name.value === 'otherHalf');
    expect(relatedField.type.kind).toEqual(Kind.NAMED_TYPE);
})

// Taken from ModelConnectionTransforner.test.ts
function getObjectType(doc: DocumentNode, type: string): ObjectTypeDefinitionNode | undefined {
    return doc.definitions.find(
        (def: DefinitionNode) => def.kind === Kind.OBJECT_TYPE_DEFINITION && def.name.value === type
    ) as ObjectTypeDefinitionNode | undefined
}

function expectFields(type: ObjectTypeDefinitionNode, fields: string[]) {
    for (const fieldName of fields) {
        const foundField = type.fields.find((f: FieldDefinitionNode) => f.name.value === fieldName)
        expect(foundField).toBeDefined()
    }
}

