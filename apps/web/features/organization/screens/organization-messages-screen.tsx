"use client";
import { useState } from "react";
import Link from "next/link";
import { useSearchParams } from "next/navigation";
import { useOrganizationDemo } from "../hooks/organization-demo-context";
import { useDemoAction } from "../hooks/use-demo-action";
import { markRead } from "../lib/demo-transitions";
import { ProjectDiscussion } from "../components/ui/project-discussion";
import { ActionLink, Badge, Button, Empty, PortalPage, portalStyles as s } from "../components/ui/portal-ui";

export function OrganizationMessagesScreen() {
  const { state } = useOrganizationDemo();
  const params = useSearchParams();
  const { run, error } = useDemoAction();
  const [query, setQuery] = useState("");
  const [unreadOnly, setUnreadOnly] = useState(false);
  const unread = (id: string) => state.messages.filter((item) => item.projectId === id && !item.read).length;
  const projects = state.projects.filter((item) => !["Draft", "In review"].includes(item.status));
  const shown = projects.filter((item) => item.title.toLowerCase().includes(query.toLowerCase().trim()) && (!unreadOnly || unread(item.id) > 0));
  const selected = params.has("project") ? projects.find((item) => item.id === params.get("project")) : shown[0];
  return <PortalPage title="Keep the conversation close to the work" description="Asynchronous project discussions, with the context your team needs." action={<ActionLink href="/organization/notifications">Notifications</ActionLink>}><div className={s.toolbar}><label className={s.search}><span className={s.label}>Find a project conversation</span><input className={s.input} type="search" value={query} onChange={(event) => setQuery(event.target.value)} /></label><label className={s.check}><input type="checkbox" checked={unreadOnly} onChange={(event) => setUnreadOnly(event.target.checked)} />Unread conversations only</label></div>{error && <p role="alert" className={s.feedback} data-error="true">{error}</p>}<div className={s.reviewLayout}><aside className={s.card}><h2>Project conversations</h2>{shown.map((item) => <Link className={s.threadLink} aria-current={selected?.id === item.id ? "page" : undefined} href={`/organization/messages?project=${item.id}`} key={item.id}><strong>{item.title}</strong><p className={s.muted}>{state.messages.filter((message) => message.projectId === item.id).length} messages</p>{unread(item.id) > 0 && <Badge tone="warning">{unread(item.id)} unread</Badge>}</Link>)}{!shown.length && <Empty title="No matching conversations" action={<Button onClick={() => { setQuery(""); setUnreadOnly(false); }}>Clear filters</Button>}>Try another search or include read conversations.</Empty>}</aside>{selected ? <div className={s.stack}><div className={s.cardTop}><h2>{selected.title}</h2>{unread(selected.id) > 0 && <Button onClick={() => run((state, context) => markRead(state, context, "messages", selected.id), "Conversation marked as read locally.")}>Mark conversation read</Button>}</div><ProjectDiscussion key={selected.id} projectId={selected.id} /></div> : <Empty title="Conversation unavailable" action={<ActionLink href="/organization/messages">All conversations</ActionLink>}>Choose a project from the list. Draft projects do not have a shared conversation.</Empty>}</div></PortalPage>;
}

export function OrganizationNotificationsScreen() {
  const { state } = useOrganizationDemo();
  const { run, error } = useDemoAction();
  const [unreadOnly, setUnreadOnly] = useState(false);
  const unread = state.events.filter((event) => !event.read).length;
  const shown = state.events.filter((event) => !unreadOnly || !event.read);
  return <PortalPage title="Your workspace inbox" description="Project activity and decisions, linked back to their context." action={<Button disabled={!unread} onClick={() => run((state, context) => markRead(state, context, "notifications", "all"), "All local notifications marked as read.")}>Mark all read</Button>}><div className={s.toolbar}><label className={s.check}><input type="checkbox" checked={unreadOnly} onChange={(event) => setUnreadOnly(event.target.checked)} />Unread only ({unread})</label></div>{error && <p role="alert" className={s.feedback} data-error="true">{error}</p>}<div className={s.list}>{shown.map((event) => <article className={s.card} key={event.id}><div className={s.cardTop}><Badge tone={event.read ? "muted" : "warning"}>{event.read ? "Read" : "Unread"}</Badge><time className={s.muted} dateTime={event.at}>{event.at.replace("T", " ").slice(0, 16)} UTC</time></div><h2 className={s.text}>{event.title}</h2><p className={s.muted}>{event.actor}</p><div className={s.cardFooter}><ActionLink href={event.href}>Open related record</ActionLink>{!event.read && <Button onClick={() => run((state, context) => markRead(state, context, "notifications", event.id), "Notification marked as read locally.")}>Mark read</Button>}</div></article>)}</div>{!shown.length && <Empty title="You’re all caught up" action={unreadOnly ? <Button onClick={() => setUnreadOnly(false)}>Show all activity</Button> : undefined}>New sample activity will appear here as you use the workspace.</Empty>}</PortalPage>;
}
