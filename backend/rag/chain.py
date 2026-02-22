"""
LangChain RAG chain using Gemini 1.5 Flash.
The system prompt instructs Gemini to:
  - Respond in the user's language
  - Cite specific document boxes/lines
  - Give actionable tax form instructions
"""

from typing import List, Optional

from langchain_google_genai import ChatGoogleGenerativeAI
from langchain.prompts import ChatPromptTemplate, MessagesPlaceholder
from langchain_core.output_parsers import StrOutputParser
from langchain_core.messages import HumanMessage

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
You are LinguaTax, a friendly and knowledgeable US tax assistant.
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


_GENERAL_SYSTEM_PROMPT = """\
You are LinguaTax, a friendly and knowledgeable US tax assistant.
The user's preferred language is {language}. You MUST respond entirely in {language}.

The user is asking general questions about US taxes and filing.

{profile_context}

Your goals:
- Explain tax concepts in clear, simple {language}, avoiding legalese.
- Preserve important tax form names and technical terms in English in parentheses.
- Provide practical, step-by-step guidance tailored to individuals (not businesses unless asked).
- If the question is about a specific US tax form (like W-2, 1040, 1099-INT, 1099-NEC, 1098-T),
  explain what the form is for, what the key boxes/lines mean, and how it usually flows into a return.
- If profile context is provided, tailor your advice to the user's specific situation (e.g. visa type,
  income sources, filing status).

Safety and scope:
- You are not a CPA or tax attorney; include a short reminder that this is general educational guidance,
  not personalized legal or tax advice, especially for high-stakes or ambiguous questions.
- If you are unsure or the answer depends heavily on details you do not have, say so clearly and suggest
  what additional information a tax professional or IRS resource would need.
"""

_general_prompt = ChatPromptTemplate.from_messages(
    [
        ("system", _GENERAL_SYSTEM_PROMPT),
        MessagesPlaceholder(variable_name="chat_history"),
    ]
)

_general_chain = _general_prompt | _llm | StrOutputParser()


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
        [f"[Page {c['metadata'].get('page', '?')}] {c['chunk_text']}" for c in chunks]
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


def answer_general_tax_question(
    question: str,
    language_code: str = "en",
    profile_summary: str = "",
    chat_history: Optional[list] = None,
    images: Optional[list] = None,
) -> str:
    """
    Generate a multilingual answer for general tax questions (no document context).
    Optionally includes a summary of the user's tax profile for personalized advice.

    images: optional list of dicts like:
      { "mime_type": "image/png", "data": "<base64_without_prefix>" }
    """
    language_name = LANG_CODE_TO_NAME.get(language_code, "English")

    profile_context = ""
    if profile_summary:
        profile_context = (
            "Here is what we know about this user's tax situation:\n"
            f"{profile_summary}\n"
            "Use this context to give more specific and relevant advice."
        )

    if chat_history is None:
        chat_history = []

    # Build a multimodal HumanMessage (text + optional images)
    msg_content = [{"type": "text", "text": question}]
    for img in (images or []):
        msg_content.append(
            {
                "type": "image_url",
                "image_url": {"url": f"data:{img['mime_type']};base64,{img['data']}"},
            }
        )

    chat_history.append(HumanMessage(content=msg_content))

    return _general_chain.invoke(
        {
            "language": language_name,
            "profile_context": profile_context,
            "chat_history": chat_history,
        }
    )


async def stream_general_tax_question(
    question: str,
    language_code: str = "en",
    profile_summary: str = "",
    chat_history: Optional[list] = None,
    images: Optional[list] = None,
):
    """
    Generate an async streaming response for general tax questions.

    Yields text chunks (strings).
    """
    language_name = LANG_CODE_TO_NAME.get(language_code, "English")

    profile_context = ""
    if profile_summary:
        profile_context = (
            "Here is what we know about this user's tax situation:\n"
            f"{profile_summary}\n"
            "Use this context to give more specific and relevant advice."
        )

    if chat_history is None:
        chat_history = []

    msg_content = [{"type": "text", "text": question}]
    for img in (images or []):
        msg_content.append(
            {
                "type": "image_url",
                "image_url": {"url": f"data:{img['mime_type']};base64,{img['data']}"},
            }
        )

    chat_history.append(HumanMessage(content=msg_content))

    async for chunk in _general_chain.astream(
        {
            "language": language_name,
            "profile_context": profile_context,
            "chat_history": chat_history,
        }
    ):
        yield chunk


# ─── Document section summarization ──────────────────────────────────────────

_SUMMARIZE_SYSTEM_PROMPT = """\
You are LinguaTax, a multilingual US tax assistant.
The user's preferred language is {language}. You MUST respond entirely in {language}.

You are given the full text content of a tax document. Your task is to produce a
clear, structured, section-by-section summary of this document.

For each section or area of the form:
1. State the section name / box number in English
2. Explain what it means in simple {language}
3. State the value found in the document (if any)
4. Explain what the user should do with this information on their tax return

Format your response with clear headings and bullet points.
If this is a standard IRS form (W-2, 1099, 1040, etc.), organize by the form's
official box/section structure.

Keep the summary practical and actionable.

--- Document content ---
{context}
--- End of content ---\
"""

_summarize_prompt = ChatPromptTemplate.from_messages(
    [
        ("system", _SUMMARIZE_SYSTEM_PROMPT),
        ("human", "Please summarize this tax document section by section in {language}."),
    ]
)

_summarize_chain = _summarize_prompt | _llm | StrOutputParser()


def summarize_document_sections(
    chunks: List[dict],
    language_code: str = "en",
) -> str:
    """
    Produce a structured section-by-section summary of a document
    from its chunks. Uses all chunks for comprehensive coverage.
    """
    language_name = LANG_CODE_TO_NAME.get(language_code, "English")

    context = "\n\n---\n\n".join(
        [f"[Page {c['metadata'].get('page', '?')}] {c['chunk_text']}" for c in chunks]
    )

    if not context:
        return "No content found in this document to summarize."

    return _summarize_chain.invoke(
        {
            "context": context,
            "language": language_name,
        }
    )