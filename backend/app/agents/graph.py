"""Minimal LangGraph-style state machine (add_node / add_edge / conditional edges) so the
workflow is explicit and bounded. Swap for langgraph.StateGraph without touching node code."""
from typing import Callable, Iterator

END = "__end__"


class StateGraph:
    def __init__(self):
        self.nodes: dict[str, Callable[[dict], dict]] = {}
        self.edges: dict[str, str | Callable[[dict], str]] = {}
        self.entry = ""

    def add_node(self, name, fn):
        self.nodes[name] = fn
        self.entry = self.entry or name

    def add_edge(self, a, b):
        self.edges[a] = b

    def add_conditional_edges(self, a, router):
        self.edges[a] = router

    def stream(self, state: dict, max_steps: int = 12) -> Iterator[tuple[str, dict]]:
        cur = self.entry
        for _ in range(max_steps):
            if cur == END:
                return
            update = self.nodes[cur](state) or {}
            state.update(update)
            yield cur, update
            nxt = self.edges.get(cur, END)
            cur = nxt(state) if callable(nxt) else nxt
