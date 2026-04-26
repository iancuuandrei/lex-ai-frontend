import uuid
from typing import List
from fastapi import FastAPI, HTTPException
from fastapi.middleware.cors import CORSMiddleware
from models import (
    QueryRequest, QueryResponse, QueryGraphResponse, 
    AnswerPayload, GraphPayload, Suggestion, LibraryItem, ProductGraphData,
    ExploreGraphData, ExploreGraphNode
)

app = FastAPI(title="LexAI API")

# Enable CORS for frontend
app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# Mock database for queries
queries_db = {}

@app.get("/")
async def root():
    return {"message": "Welcome to LexAI API"}

@app.post("/api/query", response_model=QueryResponse)
async def post_query(request: QueryRequest):
    query_id = str(uuid.uuid4())
    
    # Mock response
    response = QueryResponse(
        query_id=query_id,
        question=request.question,
        answer=AnswerPayload(
            short_answer=f"This is a mock answer for: {request.question}",
            detailed_answer=f"Here is a more detailed explanation about {request.question} in the context of {request.jurisdiction} law."
        ),
        citations=[],
        evidence_units=[],
        verifier=None,
        graph=GraphPayload(nodes=[], edges=[]),
        warnings=[]
    )
    
    queries_db[query_id] = response
    return response

@app.get("/api/query/{query_id}", response_model=QueryResponse)
async def get_query(query_id: str):
    if query_id not in queries_db:
        raise HTTPException(status_code=404, detail="Query not found")
    return queries_db[query_id]

@app.get("/api/query/{query_id}/graph", response_model=QueryGraphResponse)
async def get_query_graph(query_id: str):
    if query_id not in queries_db:
        raise HTTPException(status_code=404, detail="Query not found")
    
    return QueryGraphResponse(
        query_id=query_id,
        question=queries_db[query_id].question,
        graph=GraphPayload(nodes=[], edges=[]),
        highlighted_node_ids=[],
        highlighted_edge_ids=[],
        cited_unit_ids=[],
        reasoning_path=[]
    )

@app.get("/api/suggestions", response_model=List[Suggestion])
async def get_suggestions():
    return [
        Suggestion(id="1", text="Summarize this regulation"),
        Suggestion(id="2", text="Compare two legal provisions"),
        Suggestion(id="3", text="Generate a case brief"),
    ]

@app.get("/api/library", response_model=List[LibraryItem])
async def get_library():
    return [
        LibraryItem(id="1", title="Legislation summaries", description="Brief overviews of recent laws", type="summary"),
        LibraryItem(id="2", title="Saved notes and highlights", description="Your personal research notes", type="notes"),
        LibraryItem(id="3", title="Shared research collections", description="Collaborative research folders", type="collection"),
    ]

@app.get("/api/product/graph", response_model=ProductGraphData)
async def get_product_graph():
    return ProductGraphData(
        nodes=[
            {"id": "constructive-dismissal", "label": ["Constructive", "Dismissal"], "category": "concept", "icon": "concept", "emphasis": "core", "x": 54, "y": 49},
            {"id": "leading-cases", "label": ["Leading Cases"], "category": "case", "icon": "case", "emphasis": "hub", "x": 58, "y": 22},
            {"id": "bhasin-hrynew", "label": ["Bhasin v. Hrynew", "(2014)"], "category": "case", "icon": "case", "x": 45, "y": 13},
            {"id": "farber-royal-trust", "label": ["Farber v. Royal", "Trust Co.", "(1997)"], "category": "case", "icon": "case", "x": 58, "y": 8},
            {"id": "wallace-united-grain", "label": ["Wallace v. United", "Grain Growers", "(1997)"], "category": "case", "icon": "case", "x": 71, "y": 14},
            {"id": "potter-new-brunswick", "label": ["Potter v. New Brunswick", "Legal Aid Services", "(2004)"], "category": "case", "icon": "case", "x": 85, "y": 22},
            {"id": "key-factors", "label": ["Key Factors"], "category": "concept", "icon": "concept", "emphasis": "hub", "x": 36, "y": 53},
            {"id": "fundamental-change", "label": ["Fundamental Change", "in Employment"], "category": "concept", "icon": "concept", "x": 29, "y": 38},
            {"id": "unilateral-change", "label": ["Unilateral Change", "by Employer"], "category": "concept", "icon": "concept", "x": 22, "y": 51},
            {"id": "without-cause", "label": ["Without Just Cause", "or Notice"], "category": "concept", "icon": "concept", "x": 22, "y": 64},
            {"id": "intolerable-conditions", "label": ["Intolerable", "Work Conditions"], "category": "concept", "icon": "concept", "x": 37, "y": 69},
            {"id": "statutory-context", "label": ["Statutory Context"], "category": "statute", "icon": "statute", "emphasis": "hub", "x": 75, "y": 52},
            {"id": "ontario-employment", "label": ["Ontario Employment", "Standards Act, 2000", "s. 57"], "category": "statute", "icon": "statute", "x": 91, "y": 39},
            {"id": "canada-labour-code", "label": ["Canada Labour", "Code, R.S.C. 1985", "c. L-2, s. 240"], "category": "statute", "icon": "statute", "x": 96, "y": 53},
            {"id": "ontario-human-rights", "label": ["Ontario Human Rights", "Code, R.S.O. 1990", "c. H.19, s. 5"], "category": "statute", "icon": "statute", "x": 90, "y": 68},
            {"id": "scholarly-analysis", "label": ["Scholarly Analysis"], "category": "secondary", "icon": "secondary", "emphasis": "hub", "x": 54, "y": 76},
            {"id": "mckinley", "label": ["McKinley on", "Employment Law", "(7th Ed.)"], "category": "secondary", "icon": "secondary", "x": 42, "y": 88},
            {"id": "brown-beatty", "label": ["Brown & Beatty", "Labour Law in Canada", "(4th Ed.)"], "category": "secondary", "icon": "secondary", "x": 55, "y": 93},
            {"id": "hr-reporter", "label": ["Canadian HR", "Reporter Articles", "(2018-2024)"], "category": "secondary", "icon": "secondary", "x": 70, "y": 86},
        ],
        edges=[
            {"id": "e1", "source": "constructive-dismissal", "target": "leading-cases", "label": "defined in", "tone": "case"},
            {"id": "e2", "source": "constructive-dismissal", "target": "key-factors", "label": "evaluated by", "tone": "concept"},
            {"id": "e3", "source": "constructive-dismissal", "target": "statutory-context", "label": "interpreted under", "tone": "statute"},
            {"id": "e4", "source": "constructive-dismissal", "target": "scholarly-analysis", "label": "discussed in", "tone": "secondary"},
            {"id": "e5", "source": "leading-cases", "target": "bhasin-hrynew", "label": "cites", "tone": "case"},
            {"id": "e6", "source": "leading-cases", "target": "farber-royal-trust", "label": "cites", "tone": "case"},
            {"id": "e7", "source": "leading-cases", "target": "wallace-united-grain", "label": "cites", "tone": "case"},
            {"id": "e8", "source": "leading-cases", "target": "potter-new-brunswick", "label": "cites", "tone": "case"},
            {"id": "e9", "source": "key-factors", "target": "fundamental-change", "label": "includes", "tone": "concept"},
            {"id": "e10", "source": "key-factors", "target": "unilateral-change", "label": "includes", "tone": "concept"},
            {"id": "e11", "source": "key-factors", "target": "without-cause", "label": "includes", "tone": "concept"},
            {"id": "e12", "source": "key-factors", "target": "intolerable-conditions", "label": "includes", "tone": "concept"},
            {"id": "e13", "source": "statutory-context", "target": "ontario-employment", "label": "relevant to", "tone": "statute"},
            {"id": "e14", "source": "statutory-context", "target": "canada-labour-code", "label": "relevant to", "tone": "statute"},
            {"id": "e15", "source": "statutory-context", "target": "ontario-human-rights", "label": "relevant to", "tone": "statute"},
            {"id": "e16", "source": "scholarly-analysis", "target": "mckinley", "label": "cites", "tone": "secondary"},
            {"id": "e17", "source": "scholarly-analysis", "target": "brown-beatty", "label": "cites", "tone": "secondary"},
            {"id": "e18", "source": "scholarly-analysis", "target": "hr-reporter", "label": "cites", "tone": "secondary"},
        ]
    )

@app.get("/api/graph/explore", response_model=ExploreGraphData)
async def get_explore_graph():
    return ExploreGraphData(
        nodes=[
            ExploreGraphNode(id='n1',  label='Codul Muncii',               domain='Muncă',  zoomLevel=1),
            ExploreGraphNode(id='n2',  label='Contract Individual',         domain='Muncă',  zoomLevel=2),
            ExploreGraphNode(id='n3',  label='Concediere Colectivă',        domain='Muncă',  zoomLevel=2),
            ExploreGraphNode(id='n4',  label='Sindicat',                    domain='Muncă',  zoomLevel=3),
            ExploreGraphNode(id='n5',  label='Salariu Minim',               domain='Muncă',  zoomLevel=3),
            ExploreGraphNode(id='n6',  label='Codul Civil',                 domain='Civil',  zoomLevel=1),
            ExploreGraphNode(id='n7',  label='Contract de Vânzare',         domain='Civil',  zoomLevel=2),
            ExploreGraphNode(id='n8',  label='Răspundere Civilă',           domain='Civil',  zoomLevel=2),
            ExploreGraphNode(id='n9',  label='Drept de Proprietate',        domain='Civil',  zoomLevel=3),
            ExploreGraphNode(id='n10', label='Succesiune',                  domain='Civil',  zoomLevel=3),
            ExploreGraphNode(id='n11', label='Codul Penal',                 domain='Penal',  zoomLevel=1),
            ExploreGraphNode(id='n12', label='Infracțiuni Contra Persoanei', domain='Penal', zoomLevel=2),
            ExploreGraphNode(id='n13', label='Recidivă',                    domain='Penal',  zoomLevel=3),
            ExploreGraphNode(id='n14', label='Tentativă',                   domain='Penal',  zoomLevel=3),
            ExploreGraphNode(id='n15', label='Codul Fiscal',                domain='Fiscal', zoomLevel=1),
            ExploreGraphNode(id='n16', label='TVA',                         domain='Fiscal', zoomLevel=2),
            ExploreGraphNode(id='n17', label='Impozit pe Profit',           domain='Fiscal', zoomLevel=2),
            ExploreGraphNode(id='n18', label='Executare Silită',            domain='Fiscal', zoomLevel=3),
        ],
        edges=[
            ['n1', 'n2'], ['n1', 'n3'], ['n1', 'n4'], ['n1', 'n5'],
            ['n2', 'n3'], ['n4', 'n5'],
            ['n6', 'n7'], ['n6', 'n8'], ['n6', 'n9'], ['n6', 'n10'],
            ['n7', 'n8'], ['n9', 'n10'],
            ['n11', 'n12'], ['n11', 'n13'], ['n11', 'n14'],
            ['n12', 'n13'],
            ['n15', 'n16'], ['n15', 'n17'], ['n15', 'n18'],
            ['n2', 'n7'], ['n8', 'n12'], ['n17', 'n1'],
        ]
    )

if __name__ == "__main__":
    import uvicorn
    uvicorn.run(app, host="0.0.0.0", port=8000)
