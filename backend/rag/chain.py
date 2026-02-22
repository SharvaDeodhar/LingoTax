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
    model="gemini-2.5-flash",
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


_GENERAL_SYSTEM_PROMPT = """\
You are LingoTax, a friendly and knowledgeable US tax assistant for US immigrants and visa holders.
The user's preferred language is {language}. You MUST respond entirely in {language}.

Answer the user's US tax question clearly and helpfully based on your knowledge.
{profile_context}
If you're not certain about something, say so and suggest the user consult a licensed CPA or tax attorney.
Keep your answer concise but complete.\
"""

_general_prompt = ChatPromptTemplate.from_messages(
    [
        ("system", _GENERAL_SYSTEM_PROMPT),
        ("human", "{question}"),
    ]
)

_general_chain = _general_prompt | _llm | StrOutputParser()


_SUMMARY_SYSTEM_PROMPT = """\
You are LingoTax, a friendly US tax assistant.
The user's preferred language is {language}. You MUST respond entirely in {language}.

You have been given the COMPLETE contents of the user's tax document. Provide a thorough,
easy-to-understand breakdown so the user knows exactly what this document contains and
what they need to do with it.

Structure your response exactly as follows (translate ALL headings into {language}):

**Document Type:**
[Identify the form, e.g. W-2 Wage and Tax Statement, Form 1099-NEC, Form 1040, etc.]

**What This Document Is:**
[2-3 sentences explaining the purpose of this form in simple language]

**Key Information Found:**
[Bullet list of every important value: employer/payer name, EIN/SSN, dollar amounts by box/line, dates, states]

**What You Need to Do:**
[Numbered step-by-step instructions for using this document when filing taxes]

**Anything to Watch Out For:**
[Flag any unusual amounts, missing fields, or items that might need a CPA's attention]

--- Complete document content ---
{context}
--- End of document ---\
"""

_summary_prompt = ChatPromptTemplate.from_messages(
    [
        ("system", _SUMMARY_SYSTEM_PROMPT),
        ("human", "Please summarize and break down this tax document for me."),
    ]
)

_summary_chain = _summary_prompt | _llm | StrOutputParser()


def summarize_document(
    all_chunks: List[dict],
    language_code: str = "en",
) -> str:
    """
    Generate a comprehensive document breakdown using ALL chunks (no retrieval filtering).
    Called automatically when a user first opens a document chat.

    all_chunks: output of retrieve_all_chunks() — ordered by chunk_index
    language_code: BCP-47 code, e.g. "es", "hi"
    """
    language_name = LANG_CODE_TO_NAME.get(language_code, "English")

    context = "\n\n".join(
        f"[Page {c['metadata'].get('page', '?')}]\n{c['chunk_text']}"
        for c in all_chunks
    )

    if not context:
        context = "No content could be extracted from this document."

    return _summary_chain.invoke(
        {
            "context": context,
            "language": language_name,
        }
    )


def answer_general_question(
    question: str,
    language_code: str = "en",
    questionnaire_context: str = "",
) -> str:
    """
    Answer a general US tax question without document context.
    Optionally accepts a brief questionnaire summary for personalization.

    question: user's question (any language)
    language_code: BCP-47 code, e.g. "es", "hi"
    questionnaire_context: short plain-text summary of user's tax profile
    """
    language_name = LANG_CODE_TO_NAME.get(language_code, "English")

    profile_section = (
        f"User's tax profile context: {questionnaire_context}"
        if questionnaire_context
        else ""
    )

    return _general_chain.invoke(
        {
            "question": question,
            "language": language_name,
            "profile_context": profile_section,
        }
    )
