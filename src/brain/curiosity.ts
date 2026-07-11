import { KnowledgeGraph } from './memory/knowledge-graph';

export function generateCuriosityQuestion(kg: KnowledgeGraph, _recentLogs: any[]): string | null {
  const entityKeys = Object.keys(kg.entities);

  // Priority 1: Find entities with no relationships at all
  if (entityKeys.length > 0 && kg.relationships.length > 0) {
    const relatedEntities = new Set(kg.relationships.flatMap(r => [r.from, r.to]));
    const isolated = entityKeys.find(e => !relatedEntities.has(e));
    if (isolated) {
      return `I noticed you're working with "${isolated}". How does that fit into your broader goals?`;
    }
  }

  // Priority 2: Check for stale entities (not seen in > 14 days)
  const twoWeeksAgo = new Date();
  twoWeeksAgo.setDate(twoWeeksAgo.getDate() - 14);
  const stale = Object.entries(kg.entities).find(([_, data]) => {
    return data.lastSeen && new Date(data.lastSeen) < twoWeeksAgo;
  });
  if (stale) {
    return `You haven't mentioned "${stale[0]}" in a while. Have your priorities shifted away from it, or is it still in progress?`;
  }

  // Priority 3: Two unconnected active entities could have a relationship
  if (entityKeys.length >= 2) {
    const relatedEntities = new Set(kg.relationships.flatMap(r => [r.from, r.to]));
    const unconnected = entityKeys.filter(e => !relatedEntities.has(e));
    if (unconnected.length >= 2) {
      return `How does "${unconnected[0]}" relate to "${unconnected[1]}" in your overall plan?`;
    }
  }

  // Priority 4: Emotional probe fallback (always fires if KG is empty or fully connected)
  return `How are you feeling about your progress this week? Be honest — it helps me coach you better.`;
}
