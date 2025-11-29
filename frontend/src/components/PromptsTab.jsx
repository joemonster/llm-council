import { useState } from 'react';
import './PromptsTab.css';

// Prompty używane w sesji Rady LLM
const PROMPTS = [
  {
    id: 'stage1',
    stage: 1,
    title: 'Etap 1: Zbieranie odpowiedzi',
    description: 'Każdy model z Rady otrzymuje pytanie użytkownika i generuje swoją odpowiedź niezależnie.',
    prompt: `[Pytanie użytkownika jest wysyłane bezpośrednio do każdego modelu bez dodatkowego kontekstu]

Każdy model otrzymuje:
• Rolę: user
• Treść: {userQuery}`,
    variables: ['userQuery'],
    color: '#4a90e2',
  },
  {
    id: 'stage2',
    stage: 2,
    title: 'Etap 2: Anonimowa ocena',
    description: 'Każdy model ocenia odpowiedzi innych (zanonimizowane jako Response A, B, C...) i tworzy ranking.',
    prompt: `You are evaluating different responses to the following question:

Question: {userQuery}

Here are the responses from different models (anonymized):

{responsesText}

Your task:
1. First, evaluate each response individually. For each response, explain what it does well and what it does poorly.
2. Then, at the very end of your response, provide a final ranking.

IMPORTANT: Your final ranking MUST be formatted EXACTLY as follows:
- Start with the line "FINAL RANKING:" (all caps, with colon)
- Then list the responses from best to worst as a numbered list
- Each line should be: number, period, space, then ONLY the response label (e.g., "1. Response A")
- Do not add any other text or explanations in the ranking section

Example of the correct format for your ENTIRE response:

Response A provides good detail on X but misses Y...
Response B is accurate but lacks depth on Z...
Response C offers the most comprehensive answer...

FINAL RANKING:
1. Response C
2. Response A
3. Response B

Now provide your evaluation and ranking:`,
    variables: ['userQuery', 'responsesText'],
    color: '#f5a623',
  },
  {
    id: 'stage3',
    stage: 3,
    title: 'Etap 3: Synteza Przewodniczącego',
    description: 'Przewodniczący Rady analizuje wszystkie odpowiedzi i rankingi, tworząc końcową syntezę.',
    prompt: `You are the Chairman of an LLM Council. Multiple AI models have provided responses to a user's question, and then ranked each other's responses.

Original Question: {userQuery}

STAGE 1 - Individual Responses:
{stage1Text}

STAGE 2 - Peer Rankings:
{stage2Text}

Your task as Chairman is to synthesize all of this information into a single, comprehensive, accurate answer to the user's original question. Consider:
- The individual responses and their insights
- The peer rankings and what they reveal about response quality
- Any patterns of agreement or disagreement

Provide a clear, well-reasoned final answer that represents the council's collective wisdom:`,
    variables: ['userQuery', 'stage1Text', 'stage2Text'],
    color: '#27ae60',
  },
  {
    id: 'title',
    stage: null,
    title: 'Generator tytułu',
    description: 'Generuje krótki tytuł dla nowej konwersacji na podstawie pierwszego pytania.',
    prompt: `Generate a very short title (3-5 words maximum) that summarizes the following question.
The title should be concise and descriptive. Do not use quotes or punctuation in the title.

Question: {userQuery}

Title:`,
    variables: ['userQuery'],
    color: '#9b59b6',
  },
];

function PromptsTab() {
  const [expandedPrompt, setExpandedPrompt] = useState('stage1');

  const togglePrompt = (id) => {
    setExpandedPrompt(expandedPrompt === id ? null : id);
  };

  const highlightVariables = (text, variables) => {
    let result = text;
    variables.forEach((variable) => {
      const regex = new RegExp(`\\{${variable}\\}`, 'g');
      result = result.replace(
        regex,
        `<span class="prompt-variable">{${variable}}</span>`
      );
    });
    return result;
  };

  return (
    <div className="prompts-tab">
      <div className="prompts-intro">
        <h3>Prompty sesji Rady</h3>
        <p>
          Poniżej znajdziesz prompty używane w każdym etapie deliberacji Rady LLM.
          Zmienne oznaczone są kolorem <span className="prompt-variable-example">{'{zmienna}'}</span>.
        </p>
      </div>

      <div className="prompts-list">
        {PROMPTS.map((prompt) => (
          <div
            key={prompt.id}
            className={`prompt-card ${expandedPrompt === prompt.id ? 'expanded' : ''}`}
          >
            <button
              className="prompt-header"
              onClick={() => togglePrompt(prompt.id)}
              style={{ borderLeftColor: prompt.color }}
            >
              <div className="prompt-header-content">
                {prompt.stage && (
                  <span className="prompt-stage" style={{ backgroundColor: prompt.color }}>
                    Etap {prompt.stage}
                  </span>
                )}
                {!prompt.stage && (
                  <span className="prompt-stage auxiliary" style={{ backgroundColor: prompt.color }}>
                    Pomocniczy
                  </span>
                )}
                <span className="prompt-title">{prompt.title}</span>
              </div>
              <svg
                className={`prompt-chevron ${expandedPrompt === prompt.id ? 'rotated' : ''}`}
                width="20"
                height="20"
                viewBox="0 0 24 24"
                fill="none"
                stroke="currentColor"
                strokeWidth="2"
                strokeLinecap="round"
                strokeLinejoin="round"
              >
                <polyline points="6 9 12 15 18 9" />
              </svg>
            </button>

            {expandedPrompt === prompt.id && (
              <div className="prompt-body">
                <p className="prompt-description">{prompt.description}</p>

                <div className="prompt-variables">
                  <span className="prompt-variables-label">Zmienne:</span>
                  {prompt.variables.map((v) => (
                    <code key={v} className="prompt-variable-tag">{`{${v}}`}</code>
                  ))}
                </div>

                <div className="prompt-content-wrapper">
                  <div className="prompt-content-header">
                    <span>Treść promptu</span>
                  </div>
                  <pre
                    className="prompt-content"
                    dangerouslySetInnerHTML={{
                      __html: highlightVariables(prompt.prompt, prompt.variables),
                    }}
                  />
                </div>
              </div>
            )}
          </div>
        ))}
      </div>

      <div className="prompts-footer">
        <p>
          💡 <strong>Wskazówka:</strong> Anonimizacja w Etapie 2 zapobiega faworyzowaniu
          odpowiedzi na podstawie nazwy modelu. Modele widzą tylko "Response A, B, C..."
          bez informacji, który model jest autorem.
        </p>
      </div>
    </div>
  );
}

export default PromptsTab;
