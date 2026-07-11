import { db } from '../../db';

export interface Entity {
  type: string;
  status?: string;
  description?: string;
  lastSeen?: string;
}

export interface Relationship {
  from: string;
  relation: string;
  to: string;
  note?: string;
}

export interface KnowledgeGraph {
  entities: Record<string, Entity>;
  relationships: Relationship[];
}

function factsToKnowledgeGraph(facts: any[]): KnowledgeGraph {
  const kg: KnowledgeGraph = { entities: {}, relationships: [] };
  
  for (const fact of facts) {
    if (!kg.entities[fact.subject]) {
      kg.entities[fact.subject] = {
        type: fact.subjectType,
        lastSeen: fact.lastSeenAt.toISOString()
      };
    }
    
    // Treat 'is_a', 'has_description', 'has_status' as properties, and others as relationships
    if (fact.predicate === 'has_description') {
      kg.entities[fact.subject].description = fact.object;
    } else if (fact.predicate === 'has_status') {
      kg.entities[fact.subject].status = fact.object;
    } else if (fact.predicate !== 'is_a') {
      kg.relationships.push({
        from: fact.subject,
        relation: fact.predicate,
        to: fact.object,
        note: `Confidence: ${fact.confidence}`
      });
    }
  }
  return kg;
}

export async function getKnowledgeGraph(userId: string): Promise<KnowledgeGraph> {
  const facts = await db.worldFact.findMany({
    where: { userId, isRetired: false },
    orderBy: { lastSeenAt: 'desc' },
    take: 50
  });
  return factsToKnowledgeGraph(facts);
}

export async function upsertEntity(userId: string, name: string, entity: Partial<Entity>) {
  const subjectType = entity.type || 'unknown';

  await db.worldFact.create({
    data: {
      userId,
      subject: name,
      subjectType,
      predicate: 'is_a',
      object: subjectType,
      source: 'system'
    }
  });

  if (entity.description) {
    await db.worldFact.create({
      data: {
        userId,
        subject: name,
        subjectType,
        predicate: 'has_description',
        object: entity.description,
        source: 'system'
      }
    });
  }
  
  if (entity.status) {
    await db.worldFact.create({
      data: {
        userId,
        subject: name,
        subjectType,
        predicate: 'has_status',
        object: entity.status,
        source: 'system'
      }
    });
  }
}

export async function addRelationship(userId: string, rel: Relationship) {
  await db.worldFact.create({
    data: {
      userId,
      subject: rel.from,
      subjectType: 'entity',
      predicate: rel.relation,
      object: rel.to,
      source: 'system'
    }
  });
}

export function getRelevantContext(kg: KnowledgeGraph, limit: number = 5): string {
  const entities = Object.entries(kg.entities)
    .sort((a, b) => {
      const aDate = a[1].lastSeen ? new Date(a[1].lastSeen).getTime() : 0;
      const bDate = b[1].lastSeen ? new Date(b[1].lastSeen).getTime() : 0;
      return bDate - aDate;
    })
    .slice(0, limit);
    
  if (entities.length === 0) return 'No known entities.';
  
  const entityNames = new Set(entities.map(e => e[0]));
  const rels = kg.relationships.filter(r => entityNames.has(r.from) || entityNames.has(r.to));
  
  return JSON.stringify({
    recentEntities: Object.fromEntries(entities),
    relevantRelationships: rels
  }, null, 2);
}
