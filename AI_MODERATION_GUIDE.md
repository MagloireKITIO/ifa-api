# Guide : Modération Automatique des Témoignages par IA

## 📋 Vue d'ensemble

Le système de modération automatique des témoignages utilise l'IA (via OpenRouter) pour analyser et valider automatiquement les témoignages soumis par les utilisateurs, sans intervention humaine.

## 🔄 Workflow Automatique

```
User soumet un témoignage
         ↓
  Analyse IA automatique
         ↓
    ┌─────────┴─────────┐
    ↓                   ↓
APPROVE             REJECT
    ↓                   ↓
AUTO_APPROVED    AUTO_REJECTED
(Visible)        (Non visible)
    ↓
Notification envoyée
```

## ⚙️ Configuration

### 1. Configuration OpenRouter dans l'Admin

Dans le panneau admin, configurer les paramètres OpenRouter :

**Catégorie : `ai` (AI)**

```json
{
  "category": "ai",
  "key": "openrouter_config",
  "value": {
    "apiKey": "sk-or-v1-xxxxxxxxxxxxx",
    "model": "anthropic/claude-3.5-sonnet",
    "enableAutoTranslation": true,
    "enableAutoModeration": true
  }
}
```

**Paramètres :**
- `apiKey` : Clé API OpenRouter (obligatoire)
- `model` : Modèle à utiliser (par défaut : `anthropic/claude-3.5-sonnet`)
- `enableAutoModeration` : Activer/désactiver la modération automatique (par défaut : `true`)

### 2. Variables d'environnement

Aucune nouvelle variable d'environnement n'est requise. Le système utilise la configuration existante.

## 📊 Nouveaux Statuts de Témoignage

| Statut | Description | Visible publiquement |
|--------|-------------|---------------------|
| `PENDING` | En attente (utilisé si IA échoue) | ❌ |
| `APPROVED` | Approuvé manuellement par admin | ✅ |
| `REJECTED` | Rejeté manuellement par admin | ❌ |
| `AUTO_APPROVED` | Approuvé automatiquement par IA | ✅ |
| `AUTO_REJECTED` | Rejeté automatiquement par IA | ❌ |

## 🤖 Critères d'Analyse de l'IA

L'IA analyse chaque témoignage selon ces critères :

### ✅ Critères d'Approbation

1. **Contenu approprié** : Pas de contenu haineux, violent, sexuel ou offensant
2. **Pertinence** : Lié à la foi chrétienne, prière, expérience spirituelle
3. **Cohérence** : Texte compréhensible et bien écrit
4. **Pas de spam** : Pas de publicité ou contenu promotionnel
5. **Longueur suffisante** : Au moins 10 mots

### ❌ Critères de Rejet

- Contenu inapproprié détecté
- Spam ou publicité
- Texte incohérent ou incompréhensible
- Trop court (< 10 mots)
- Non pertinent (pas lié à la foi)

## 📦 Métadonnées Stockées

Chaque témoignage analysé par l'IA contient les métadonnées suivantes dans le champ `aiModerationData` :

```typescript
{
  decision: "APPROVE" | "REJECT",
  confidence: 85, // Score de confiance (0-100)
  reason: "Contenu approprié et pertinent...",
  categories: {
    isAppropriate: true,
    isRelevant: true,
    isCoherent: true,
    isSpam: false,
    hasInappropriateContent: false
  },
  analyzedAt: "2025-01-13T10:30:00Z",
  model: "anthropic/claude-3.5-sonnet"
}
```

## 📡 Endpoints API

### Admin - Consulter les témoignages

**GET** `/admin/testimonies`
- Retourne tous les témoignages avec leur statut et métadonnées IA
- Permissions requises : `TESTIMONIES_READ`

**GET** `/admin/testimonies/stats/count-by-status`
- Retourne le nombre de témoignages par statut
- Inclut les compteurs pour `autoApproved` et `autoRejected`

Réponse :
```json
{
  "pending": 5,
  "approved": 120,
  "rejected": 15,
  "autoApproved": 450,
  "autoRejected": 32,
  "total": 622
}
```

### Public - Liste des témoignages approuvés

**GET** `/testimonies/public`
- Retourne uniquement les témoignages avec statut `APPROVED` ou `AUTO_APPROVED`
- Accessible sans authentification

### User - Soumettre un témoignage

**POST** `/testimonies`
- Crée un nouveau témoignage
- L'IA l'analyse automatiquement
- Retourne le témoignage avec son statut et métadonnées IA

## 🔍 Consultation des Actions IA (Admin)

L'admin peut consulter :

1. **Liste des témoignages** : Voir tous les témoignages avec leur statut (AUTO_APPROVED / AUTO_REJECTED)
2. **Détails d'un témoignage** : Voir les métadonnées IA complètes (decision, confidence, reason, categories)
3. **Statistiques** : Voir le nombre de témoignages approuvés/rejetés automatiquement

## 🛠️ Mode Fallback

Si l'IA n'est pas disponible ou échoue :

1. Le système applique une règle simple :
   - Témoignage < 10 mots → `REJECTED`
   - Témoignage ≥ 10 mots → `APPROVED`
2. Confidence = 50% (faible confiance)
3. Model = "fallback"

## 🚨 Gestion des Erreurs

| Cas d'erreur | Comportement |
|-------------|--------------|
| API OpenRouter indisponible | Mode fallback activé |
| Clé API invalide | Mode fallback activé |
| Modération désactivée dans settings | Mode fallback activé |
| Réponse IA invalide | Mode fallback activé |

## 📈 Logs et Traçabilité

Tous les événements sont loggés :

```
[TestimoniesService] Starting AI moderation for new testimony (language: fr)
[AiModerationService] Moderation completed: Decision=APPROVE, Confidence=92%
[TestimoniesService] Testimony created with status: AUTO_APPROVED (ID: 123e4567...)
[TestimoniesService] Notification sent for auto-approved testimony: 123e4567...
```

## 💰 Coûts Estimés

Avec Claude 3.5 Sonnet via OpenRouter :
- Coût par témoignage : ~$0.003-$0.015
- 1000 témoignages/mois : ~$3-$15/mois

## ✅ Avantages

1. **Instantané** : Validation en temps réel (< 3 secondes)
2. **Cohérent** : Critères uniformes d'évaluation
3. **Évolutif** : Gère un grand volume de témoignages
4. **Traçable** : Toutes les décisions IA sont enregistrées
5. **Multilingue** : Support FR et EN natif

## 🔧 Désactiver la Modération Automatique

Pour désactiver temporairement :

1. Dans l'admin, modifier les settings `openrouter_config`
2. Mettre `enableAutoModeration: false`
3. Les nouveaux témoignages auront le statut `PENDING`

## 📞 Support

Pour toute question ou problème :
- Consulter les logs de l'application
- Vérifier la configuration OpenRouter dans l'admin
- S'assurer que la clé API est valide
