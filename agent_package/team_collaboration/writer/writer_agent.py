from typing import TypedDict, List, Dict
from langgraph.graph import StateGraph, END
from pydantic import BaseModel


# --- 1. Data Models ---
class AgentEnv(BaseModel):
    pass


class AgentInputs(BaseModel):
    research_notes: List[str]
    tone: str = "Professional"


# --- 2. State Definition ---
class AgentState(TypedDict):
    research_notes: List[str]
    tone: str
    draft: str


# --- 3. Nodes ---
def write_node(state: AgentState):
    print(f"--- Writing Article (Tone: {state['tone']}) ---")

    notes = state["research_notes"]
    tone = state["tone"]

    # Mock writing logic
    intro = f"In this {tone.lower()} analysis, we explore the following key points:\n\n"
    body = "\n".join([f"- {note}" for note in notes])
    conclusion = "\n\nIn conclusion, these findings suggest a significant trend."

    draft = intro + body + conclusion

    return {"draft": draft}


# --- 4. Graph ---
def build_graph():
    workflow = StateGraph(AgentState)
    workflow.add_node("write", write_node)
    workflow.set_entry_point("write")
    workflow.add_edge("write", END)
    return workflow.compile()


agent_graph = build_graph()


# --- 5. Helpers ---
def get_initial_state(env: AgentEnv, inputs: AgentInputs) -> AgentState:
    return {"research_notes": inputs.research_notes, "tone": inputs.tone, "draft": ""}


def get_result(state: AgentState) -> Dict:
    return {"draft_article": state["draft"]}
