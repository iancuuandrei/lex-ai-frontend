from typing import List, Optional, Dict, Any, Union
from pydantic import BaseModel, Field

class QueryRequest(BaseModel):
    question: str
    jurisdiction: str
    date: str
    mode: str
    debug: Optional[bool] = False

class AnswerPayload(BaseModel):
    short_answer: Optional[str] = None
    detailed_answer: Optional[str] = None

class Citation(BaseModel):
    id: Optional[str] = None
    unit_id: Optional[str] = None
    evidence_unit_id: Optional[str] = None
    node_id: Optional[str] = None
    label: Optional[str] = None
    title: Optional[str] = None
    source: Optional[str] = None
    act_title: Optional[str] = None
    article: Optional[Union[str, int]] = None
    paragraph: Optional[Union[str, int]] = None
    excerpt: Optional[str] = None
    raw_text: Optional[str] = None
    url: Optional[str] = None
    metadata: Optional[Dict[str, Any]] = None

class EvidenceUnit(BaseModel):
    id: str
    unit_id: Optional[str] = None
    node_id: Optional[str] = None
    type: Optional[str] = None
    label: Optional[str] = None
    title: Optional[str] = None
    source: Optional[str] = None
    excerpt: Optional[str] = None
    raw_text: Optional[str] = None
    score: Optional[float] = None
    metadata: Optional[Dict[str, Any]] = None

class VerifierPayload(BaseModel):
    status: Optional[str] = None
    summary: Optional[str] = None
    rationale: Optional[str] = None
    confidence: Optional[float] = None
    metadata: Optional[Dict[str, Any]] = None

class GraphNode(BaseModel):
    id: str
    label: str
    type: Optional[str] = None
    node_type: Optional[str] = None
    metadata: Optional[Dict[str, Any]] = None

class GraphEdge(BaseModel):
    id: Optional[str] = None
    source: str
    target: str
    type: Optional[str] = None
    edge_type: Optional[str] = None
    label: Optional[str] = None
    metadata: Optional[Dict[str, Any]] = None

class GraphPayload(BaseModel):
    nodes: List[GraphNode]
    edges: List[GraphEdge]

class QueryResponse(BaseModel):
    query_id: str
    question: str
    answer: AnswerPayload
    citations: List[Citation]
    evidence_units: List[EvidenceUnit]
    verifier: Optional[VerifierPayload] = None
    graph: GraphPayload
    debug: Optional[Dict[str, Any]] = None
    warnings: List[str]

class ReasoningPathItem(BaseModel):
    node_id: Optional[str] = None
    edge_id: Optional[str] = None
    label: Optional[str] = None
    description: Optional[str] = None
    metadata: Optional[Dict[str, Any]] = None

class QueryGraphResponse(BaseModel):
    query_id: str
    question: str
    graph: GraphPayload
    highlighted_node_ids: List[str]
    highlighted_edge_ids: List[str]
    cited_unit_ids: List[str]
    reasoning_path: List[Union[str, ReasoningPathItem]]
    verifier_summary: Optional[str] = None

class Suggestion(BaseModel):
    id: str
    text: str

class LibraryItem(BaseModel):
    id: str
    title: str
    description: str
    type: str

class ProductGraphData(BaseModel):
    nodes: List[Any]
    edges: List[Any]

class ExploreGraphNode(BaseModel):
    id: str
    label: str
    domain: str
    zoomLevel: int

class ExploreGraphData(BaseModel):
    nodes: List[ExploreGraphNode]
    edges: List[List[str]]
