from typing import TypedDict, List, Dict
from langgraph.graph import StateGraph, END
from pydantic import BaseModel


# --- 1. Data Models ---
class AgentEnv(BaseModel):
    pass


class AgentInputs(BaseModel):
    draft_article: str


# --- 2. State Definition ---
class AgentState(TypedDict):
    draft: str
    final: str
    critique: str


# --- 3. Nodes ---
def edit_node(state: AgentState):
    print("--- Editing Article ---")
    draft = state["draft"]

    # Mock editing logic
    final = draft.replace("significant trend", "notable market shift")
    final += "\n\n(Edited by Editor Agent)"

    critique = "Improved vocabulary and added signature."

    return {"final": final, "critique": critique}


# --- 4. Graph ---
def build_graph():
    workflow = StateGraph(AgentState)
    workflow.add_node("edit", edit_node)
    workflow.set_entry_point("edit")
    workflow.add_edge("edit", END)
    return workflow.compile()


agent_graph = build_graph()


# --- 5. Helpers ---
def get_initial_state(env: AgentEnv, inputs: AgentInputs) -> AgentState:
    return {"draft": inputs.draft_article, "final": "", "critique": ""}


def get_result(state: AgentState) -> Dict:
    return {"final_article": state["final"], "critique": state["critique"]}
