import sys
import os

# Add agent packages to path
sys.path.append(
    os.path.join(os.getcwd(), "agent_package", "team_collaboration", "researcher")
)
sys.path.append(
    os.path.join(os.getcwd(), "agent_package", "team_collaboration", "writer")
)
sys.path.append(
    os.path.join(os.getcwd(), "agent_package", "team_collaboration", "editor")
)

import researcher_agent
import writer_agent
import editor_agent


def main():
    print("--- Testing Researcher ---")
    res_inputs = researcher_agent.AgentInputs(topic="AI Agents")
    res_state = researcher_agent.get_initial_state(None, res_inputs)
    res_output = researcher_agent.agent_graph.invoke(res_state)
    res_result = researcher_agent.get_result(res_output)
    print("Researcher Result:", res_result)

    print("\n--- Testing Writer ---")
    writer_inputs = writer_agent.AgentInputs(
        research_notes=res_result["research_notes"], tone="Professional"
    )
    writer_state = writer_agent.get_initial_state(None, writer_inputs)
    writer_output = writer_agent.agent_graph.invoke(writer_state)
    writer_result = writer_agent.get_result(writer_output)
    print("Writer Result:", writer_result)

    print("\n--- Testing Editor ---")
    editor_inputs = editor_agent.AgentInputs(
        draft_article=writer_result["draft_article"]
    )
    editor_state = editor_agent.get_initial_state(None, editor_inputs)
    editor_output = editor_agent.agent_graph.invoke(editor_state)
    editor_result = editor_agent.get_result(editor_output)
    print("Editor Result:", editor_result)

    print("\nSUCCESS: All agents executed correctly.")


if __name__ == "__main__":
    main()
