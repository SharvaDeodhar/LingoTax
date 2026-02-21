"""
LangChain RAG chain using Gemini 1.5 Flash.
The system prompt instructs Gemini to:
  - Respond in the user's language
  - Cite specific document boxes/lines
  - Give actionable tax form instructions
"""

from typing import List

from langchain_google_genai import ChatGoogleGenerativeAI
from langchain.prompts import ChatPromptTemplate
from langchain_core.output_parsers import StrOutputParser

from config import settings

# BCP-47 code → language name for injection into the system prompt
LANG_CODE_TO_NAME: dict = {
    "en":      "English",
    "es":      "Spanish",
    "zh-Hans": "Simplified Chinese",
    "zh-Hant": "Traditional Chinese",
    "hi":      "Hindi",
    "ko":      "Korean",
    "vi":      "Vietnamese",
    "pt":      "Portuguese (Brazilian)",
    "ar":      "Arabic",
    "tl":      "Filipino (Tagalog)",
    "bn":      "Bengali",
    "gu":      "Gujarati",
    "pa":      "Punjabi",
    "ta":      "Tamil",
    "te":      "Telugu",
    "ur":      "Urdu",
    "ja":      "Japanese",
    "fr":      "French",
    "de":      "German",
}

_SYSTEM_PROMPT = """\
You are LingoTax, a friendly and knowledgeable US tax assistant.
The user's preferred language is {language}. You MUST respond entirely in {language}.

You have been provided with excerpts from the user's tax document.
Answer the user's question based ONLY on the provided document context.

Structure EVERY answer in exactly this format (translated into {language}):

**What I found in your document:**
[State the specific value and field name from the document]

**Which box/line it came from:**
[E.g., "W-2, Box 1 – Wages, tips, other compensation: $52,000.00"]

**What to do on your tax form:**
[Actionable instruction: which form, which line, what to enter]

If the answer cannot be found in the document context, say so clearly in {language}
and suggest the user check the relevant section of the form directly.

--- Document context ---
{context}
--- End of context ---\
"""

_llm = ChatGoogleGenerativeAI(
    model="gemini-1.5-flash",
    google_api_key=settings.gemini_api_key,
    temperature=0.2,
    max_output_tokens=2048,
)

_prompt = ChatPromptTemplate.from_messages(
    [
        ("system", _SYSTEM_PROMPT),
        ("human", "{question}"),
    ]
)

_rag_chain = _prompt | _llm | StrOutputParser()


def answer_question(
    question: str,
    chunks: List[dict],
    language_code: str = "en",
) -> str:
    """
    Generate a multilingual RAG answer.

    question: user's raw question (in any language)
    chunks:   retrieved chunks from retrieve_chunks()
    language_code: BCP-47 code, e.g. "es", "hi", "zh-Hans"
    """
    language_name = LANG_CODE_TO_NAME.get(language_code, "English")

    context = "\n\n---\n\n".join(
        [
            f"[Page {c['metadata'].get('page', '?')}] {c['chunk_text']}"
            for c in chunks
        ]
    )

    if not context:
        context = "No relevant content found in the document."

    return _rag_chain.invoke(
        {
            "question": question,
            "context": context,
            "language": language_name,
        }
    )
