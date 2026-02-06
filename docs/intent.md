Intent + category detection should happen in the Orchestrator (Node BFF) before it calls any commerce tools. Think of it as a small “NLU layer” that turns a user message into a structured shopping request.

Where we check intent
Primary place: Node Orchestrator

Pipeline for every chat message:

Pre-process

normalize text, detect language/locale

redact PII for logs

Intent + slot extraction (NLU)
Convert user text → a structured object like:

{
"intent": "PRODUCT_SEARCH",
"categoryHint": "HEADPHONES",
"constraints": {
"priceMax": 5000,
"brand": null,
"keywords": ["headphone"]
},
"needClarification": false
}

Category resolution

Map categoryHint + keywords to your canonical taxonomy node (more below)

Tool plan

If PRODUCT_SEARCH → call commerce.searchProducts

If COMPARE → call commerce.compareProducts

If ADD_TO_CART → call commerce.cart.addItem

etc.

✅ This keeps all “brain” logic in one place and prevents providers/tools from guessing.

How to detect category (headphone vs Nike t-shirt)

You need a category/taxonomy resolver. Two common ways:

Option A (best): Hybrid = Rules + Lightweight LLM classifier

Use a quick classifier step (LLM or smaller model) that outputs JSON:

Classifier output schema

{
"intent": "PRODUCT_SEARCH",
"category": {
"canonicalId": "electronics.audio.headphones",
"confidence": 0.92
},
"entities": {
"brand": null,
"priceMax": 5000,
"attributes": { "wireless": null }
},
"queryRewrite": "headphones under 5000"
}

Then the orchestrator calls:

{
"query": "headphones under 5000",
"filters": { "priceMax": 5000, "categories": ["electronics.audio.headphones"] }
}

Option B: Rules + dictionary (fast MVP)

Maintain a keyword dictionary:

headphone, earphone, earbuds → electronics.audio

tshirt, tee, polo → fashion.apparel.tops

And brand dictionary:

nike, adidas → fashion brands (but Nike can also appear in shoes)

Then disambiguate using context:

“nike tshirt” strongly → apparel/tops

“nike running shoes” → footwear

This works but needs constant tuning.

What intent types you should support (MVP)

In the orchestrator, detect one of these:

PRODUCT_SEARCH

PRODUCT_COMPARE

ADD_TO_CART

UPDATE_CART_QTY / REMOVE_FROM_CART

CHECKOUT / CREATE_ORDER

ORDER_STATUS

POLICY_QA (returns/warranty/delivery questions)

Example interpretations

“I want 5000 rs headphone”

intent: PRODUCT_SEARCH

category: headphones/audio

priceMax: 5000

“I want tshirt nike”

intent: PRODUCT_SEARCH

category: apparel.tops.tshirts

brand: Nike

Where taxonomy comes from (important)

You need a canonical taxonomy list like:

electronics.audio.headphones

fashion.apparel.tops.tshirts

fashion.footwear.sneakers

…

You can build it from:

provider category tree(s), then normalize

or your own curated list for top categories

The orchestrator should resolve category to a canonicalId, and the Java tool server maps canonical categories to each provider’s categories.

Minimal implementation plan (clean + reliable)
In Node Orchestrator (recommended)

Create 2 internal functions (not MCP tools):

classifyIntentAndExtractSlots(text, context) -> IntentFrame

Use LLM with strict JSON output

Add a small rules fallback

resolveCategory(intentFrame) -> canonicalCategoryId

Use taxonomy lookup + synonyms + confidence threshold

If low confidence → ask a clarifying question:

“Do you mean headphones or earbuds?”

“Nike t-shirt for men or women?”

Then call Java MCP tools with canonical fields

commerce.searchProducts with filters.categories=[canonicalId], filters.priceMax, filters.brands

Quick example end-to-end

User: “I want 5000 rs headphone”

Orchestrator builds

{
"intent": "PRODUCT_SEARCH",
"canonicalCategoryId": "electronics.audio.headphones",
"filters": { "priceMax": 5000 },
"query": "headphones under 5000"
}

Calls tool
commerce.searchProducts({ query, filters, pagination })

Returns cards
Headphones results with actions: View / Add to cart
