agent TestAgent {
  nodes {
    llm Echo {
      model: "gpt-4o-mini"
      prompt: "This is a test. ${input}"
    }
  }
  edges {
    START -> Echo
    Echo -> END
  }
}
