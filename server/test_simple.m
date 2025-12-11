agent TestAgent {


  nodes {
    llm TestNode {
      model: "gpt-3.5-turbo"
      prompt: "Say 'Hello World' and nothing else."
    }
  }

  edges {
    START -> TestNode
    TestNode -> END
  }
}
