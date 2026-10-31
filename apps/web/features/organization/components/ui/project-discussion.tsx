"use client";
import { useState } from "react";
import { useOrganizationDemo } from "../../hooks/organization-demo-context";
import { useDemoAction } from "../../hooks/use-demo-action";
import { demoActor, postProjectText } from "../../lib/demo-transitions";
import { Button, Empty, Field, portalStyles as s } from "./portal-ui";

export function ProjectDiscussion({ projectId }: { projectId: string }) {
  const { state } = useOrganizationDemo();
  const { run, error } = useDemoAction();
  const [body, setBody] = useState("");
  const project = state.projects.find((item) => item.id === projectId);
  const messages = state.messages.filter((item) => item.projectId === projectId);
  const canPost = project && ["Active", "Recruiting", "Published"].includes(project.status);
  return <section className={s.card}><h2>Project discussion</h2><p className={s.muted}>Shared sample project context only. Private mentor feedback is not included.</p><div className={s.messageList} aria-label="Discussion messages">{messages.map((message) => <article className={s.message} data-own={message.author === demoActor} key={message.id}><div className={s.messageMeta}><strong>{message.author}</strong><time dateTime={message.at}>{message.at.replace("T", " ").slice(0, 16)} UTC</time></div><p>{message.body}</p></article>)}{!messages.length && <Empty title="Start a useful conversation">Ask a clear question or share the next step for this sample project.</Empty>}</div>{canPost ? <form className={s.stack} onSubmit={(event) => { event.preventDefault(); if (run((state, context) => postProjectText(state, context, projectId, body, "message"), "Reply added locally. No message was sent to a real participant.")) setBody(""); }}><Field label="Write a sample reply" hint={`${body.length}/2,000 characters · plain text only`}>{(props) => <textarea {...props} required maxLength={2000} value={body} onChange={(event) => setBody(event.target.value)} />}</Field>{error && <p role="alert" className={s.feedback} data-error="true">{error}</p>}<div className={s.actions}><Button primary type="submit" disabled={!body.trim()}>Post local reply</Button></div></form> : <p className={s.muted}>This project’s discussion is read-only.</p>}</section>;
}
