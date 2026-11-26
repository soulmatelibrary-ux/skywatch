-- =====================================================================
-- SkyWatch DB 스키마 (자료 없음) — pg_dump --schema-only, PostgreSQL 17
-- 빈 DB 에 넣는다:  psql -U postgres -d skywatch -f db/schema.sql
-- 필요 확장: vector(pgvector), pg_trgm, pgcrypto  (pgvector 는 미리 설치)
-- 맨 끝에 alembic 버전(head)을 적어 두어, 백엔드가 켜질 때 이후 마이그레이션만 이어서 실행한다.
-- 스키마를 바꾸면 Alembic 마이그레이션을 추가하고 이 파일을 다시 만든다 (README 참고).
-- =====================================================================

--
-- PostgreSQL database dump
--

\restrict 60ol9sUHCZ887wSgpEcpSAYtbe9hEjWhegNhKgfFav9F00v1iZzidu2gTYbdLc9

-- Dumped from database version 17.6
-- Dumped by pg_dump version 17.6

SET statement_timeout = 0;
SET lock_timeout = 0;
SET idle_in_transaction_session_timeout = 0;
SET transaction_timeout = 0;
SET client_encoding = 'UTF8';
SET standard_conforming_strings = on;
SELECT pg_catalog.set_config('search_path', '', false);
SET check_function_bodies = false;
SET xmloption = content;
SET client_min_messages = warning;
SET row_security = off;

--
-- Name: public; Type: SCHEMA; Schema: -; Owner: -
--

-- *not* creating schema, since initdb creates it


--
-- Name: pg_trgm; Type: EXTENSION; Schema: -; Owner: -
--

CREATE EXTENSION IF NOT EXISTS pg_trgm WITH SCHEMA public;


--
-- Name: pgcrypto; Type: EXTENSION; Schema: -; Owner: -
--

CREATE EXTENSION IF NOT EXISTS pgcrypto WITH SCHEMA public;


--
-- Name: vector; Type: EXTENSION; Schema: -; Owner: -
--

CREATE EXTENSION IF NOT EXISTS vector WITH SCHEMA public;


SET default_tablespace = '';

SET default_table_access_method = heap;

--
-- Name: alembic_version; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.alembic_version (
    version_num character varying(32) NOT NULL
);


--
-- Name: skywatch_attachments; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.skywatch_attachments (
    id integer NOT NULL,
    owner_type character varying(20) NOT NULL,
    owner_id integer NOT NULL,
    original_name character varying(255) NOT NULL,
    file_path character varying(500) NOT NULL,
    file_name character varying(255) NOT NULL,
    file_size bigint NOT NULL,
    mime_type character varying(100),
    uploaded_by integer NOT NULL,
    created_at timestamp with time zone DEFAULT now() NOT NULL,
    is_deleted boolean DEFAULT false NOT NULL,
    content_text text,
    CONSTRAINT skywatch_attachments_owner_type_check CHECK (((owner_type)::text = ANY ((ARRAY['card'::character varying, 'task'::character varying, 'comment'::character varying, 'issue'::character varying])::text[])))
);


--
-- Name: skywatch_attachments_id_seq; Type: SEQUENCE; Schema: public; Owner: -
--

CREATE SEQUENCE public.skywatch_attachments_id_seq
    AS integer
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


--
-- Name: skywatch_attachments_id_seq; Type: SEQUENCE OWNED BY; Schema: public; Owner: -
--

ALTER SEQUENCE public.skywatch_attachments_id_seq OWNED BY public.skywatch_attachments.id;


--
-- Name: skywatch_backup_logs; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.skywatch_backup_logs (
    id integer NOT NULL,
    action character varying(20) NOT NULL,
    status character varying(10) NOT NULL,
    filename character varying(255),
    file_size_bytes integer,
    error_message text,
    performed_by integer,
    created_at timestamp with time zone DEFAULT now() NOT NULL,
    is_deleted boolean DEFAULT false NOT NULL,
    deleted_at timestamp with time zone,
    deleted_by integer
);


--
-- Name: skywatch_backup_logs_id_seq; Type: SEQUENCE; Schema: public; Owner: -
--

CREATE SEQUENCE public.skywatch_backup_logs_id_seq
    AS integer
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


--
-- Name: skywatch_backup_logs_id_seq; Type: SEQUENCE OWNED BY; Schema: public; Owner: -
--

ALTER SEQUENCE public.skywatch_backup_logs_id_seq OWNED BY public.skywatch_backup_logs.id;


--
-- Name: skywatch_card_categories; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.skywatch_card_categories (
    id integer NOT NULL,
    name character varying(50) NOT NULL,
    color character varying(20) DEFAULT 'gray'::character varying NOT NULL,
    sort_order integer DEFAULT 0 NOT NULL,
    is_active boolean DEFAULT true NOT NULL,
    created_by integer,
    created_at timestamp with time zone DEFAULT now() NOT NULL
);


--
-- Name: skywatch_card_categories_id_seq; Type: SEQUENCE; Schema: public; Owner: -
--

CREATE SEQUENCE public.skywatch_card_categories_id_seq
    AS integer
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


--
-- Name: skywatch_card_categories_id_seq; Type: SEQUENCE OWNED BY; Schema: public; Owner: -
--

ALTER SEQUENCE public.skywatch_card_categories_id_seq OWNED BY public.skywatch_card_categories.id;


--
-- Name: skywatch_card_links; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.skywatch_card_links (
    source_card_id integer NOT NULL,
    target_card_id integer NOT NULL,
    created_by integer,
    created_at timestamp with time zone DEFAULT now() NOT NULL,
    id integer NOT NULL,
    CONSTRAINT skywatch_card_links_check CHECK ((source_card_id <> target_card_id))
);


--
-- Name: skywatch_card_links_id_seq; Type: SEQUENCE; Schema: public; Owner: -
--

CREATE SEQUENCE public.skywatch_card_links_id_seq
    AS integer
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


--
-- Name: skywatch_card_links_id_seq; Type: SEQUENCE OWNED BY; Schema: public; Owner: -
--

ALTER SEQUENCE public.skywatch_card_links_id_seq OWNED BY public.skywatch_card_links.id;


--
-- Name: skywatch_card_memo_checks; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.skywatch_card_memo_checks (
    card_id integer NOT NULL,
    user_id integer NOT NULL,
    checked_at timestamp with time zone DEFAULT now() NOT NULL
);


--
-- Name: skywatch_card_memos; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.skywatch_card_memos (
    card_id integer NOT NULL,
    target_type character varying(10) DEFAULT 'next'::character varying NOT NULL,
    target_user_id integer,
    keep character varying(10) DEFAULT 'checked'::character varying NOT NULL,
    keep_until date,
    created_at timestamp with time zone DEFAULT now() NOT NULL
);


--
-- Name: skywatch_card_status_backup_044; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.skywatch_card_status_backup_044 (
    card_id integer NOT NULL,
    old_status character varying(20),
    old_completed_by integer,
    old_completed_at timestamp with time zone,
    old_status_changed_by integer,
    old_status_changed_at timestamp with time zone
);


--
-- Name: skywatch_card_statuses; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.skywatch_card_statuses (
    id integer NOT NULL,
    key character varying(30) NOT NULL,
    label character varying(50) NOT NULL,
    color character varying(20),
    sort_order integer DEFAULT 0 NOT NULL,
    is_system boolean DEFAULT false NOT NULL,
    is_active boolean DEFAULT true NOT NULL,
    is_deleted boolean DEFAULT false NOT NULL,
    deleted_by integer,
    deleted_at timestamp with time zone,
    created_by integer,
    created_at timestamp with time zone DEFAULT now() NOT NULL
);


--
-- Name: skywatch_card_statuses_id_seq; Type: SEQUENCE; Schema: public; Owner: -
--

CREATE SEQUENCE public.skywatch_card_statuses_id_seq
    AS integer
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


--
-- Name: skywatch_card_statuses_id_seq; Type: SEQUENCE OWNED BY; Schema: public; Owner: -
--

ALTER SEQUENCE public.skywatch_card_statuses_id_seq OWNED BY public.skywatch_card_statuses.id;


--
-- Name: skywatch_card_vectors; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.skywatch_card_vectors (
    id integer NOT NULL,
    card_id integer NOT NULL,
    chunk_no integer NOT NULL,
    chunk_text text NOT NULL,
    embedding bytea NOT NULL,
    model_name character varying(50) DEFAULT 'kure-v1'::character varying NOT NULL,
    updated_at timestamp with time zone DEFAULT now(),
    embedding_vector public.vector(1024)
);


--
-- Name: skywatch_card_vectors_id_seq; Type: SEQUENCE; Schema: public; Owner: -
--

CREATE SEQUENCE public.skywatch_card_vectors_id_seq
    AS integer
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


--
-- Name: skywatch_card_vectors_id_seq; Type: SEQUENCE OWNED BY; Schema: public; Owner: -
--

ALTER SEQUENCE public.skywatch_card_vectors_id_seq OWNED BY public.skywatch_card_vectors.id;


--
-- Name: skywatch_comment_reactions; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.skywatch_comment_reactions (
    comment_id integer NOT NULL,
    user_id integer NOT NULL,
    emoji character varying(10) NOT NULL,
    created_at timestamp with time zone DEFAULT now() NOT NULL
);


--
-- Name: skywatch_comments; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.skywatch_comments (
    id integer NOT NULL,
    log_id integer NOT NULL,
    author_id integer NOT NULL,
    parent_id integer,
    body text NOT NULL,
    created_at timestamp with time zone DEFAULT now() NOT NULL,
    updated_at timestamp with time zone DEFAULT now() NOT NULL,
    is_deleted boolean DEFAULT false NOT NULL,
    deleted_by integer,
    deleted_at timestamp with time zone
);


--
-- Name: skywatch_comments_id_seq; Type: SEQUENCE; Schema: public; Owner: -
--

CREATE SEQUENCE public.skywatch_comments_id_seq
    AS integer
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


--
-- Name: skywatch_comments_id_seq; Type: SEQUENCE OWNED BY; Schema: public; Owner: -
--

ALTER SEQUENCE public.skywatch_comments_id_seq OWNED BY public.skywatch_comments.id;


--
-- Name: skywatch_commute_months; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.skywatch_commute_months (
    id integer NOT NULL,
    ym character varying(7) NOT NULL,
    file_name character varying(255) DEFAULT ''::character varying NOT NULL,
    row_count integer DEFAULT 0 NOT NULL,
    rows jsonb NOT NULL,
    uploaded_by integer,
    uploaded_at timestamp with time zone DEFAULT now() NOT NULL
);


--
-- Name: skywatch_commute_months_id_seq; Type: SEQUENCE; Schema: public; Owner: -
--

CREATE SEQUENCE public.skywatch_commute_months_id_seq
    AS integer
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


--
-- Name: skywatch_commute_months_id_seq; Type: SEQUENCE OWNED BY; Schema: public; Owner: -
--

ALTER SEQUENCE public.skywatch_commute_months_id_seq OWNED BY public.skywatch_commute_months.id;


--
-- Name: skywatch_configs; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.skywatch_configs (
    id integer NOT NULL,
    setting_key character varying(100) NOT NULL,
    setting_value text,
    updated_at timestamp with time zone DEFAULT now() NOT NULL
);


--
-- Name: skywatch_configs_id_seq; Type: SEQUENCE; Schema: public; Owner: -
--

CREATE SEQUENCE public.skywatch_configs_id_seq
    AS integer
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


--
-- Name: skywatch_configs_id_seq; Type: SEQUENCE OWNED BY; Schema: public; Owner: -
--

ALTER SEQUENCE public.skywatch_configs_id_seq OWNED BY public.skywatch_configs.id;


--
-- Name: skywatch_inquiries; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.skywatch_inquiries (
    id integer NOT NULL,
    inquiry_no character varying(20) NOT NULL,
    occurred_date date NOT NULL,
    occurred_time character varying(10),
    controller_sector character varying(100),
    sw_version character varying(20),
    received_by integer,
    received_by_raw character varying(50),
    category character varying(100),
    keyword character varying(255),
    content text,
    status character varying(20) DEFAULT 'in_progress'::character varying NOT NULL,
    completed_date date,
    pr_no character varying(20),
    note text,
    card_id integer,
    created_by integer,
    created_at timestamp with time zone DEFAULT now() NOT NULL,
    updated_at timestamp with time zone DEFAULT now() NOT NULL,
    last_edited_by integer,
    is_deleted boolean DEFAULT false NOT NULL,
    deleted_by integer,
    deleted_at timestamp with time zone
);


--
-- Name: skywatch_inquiries_id_seq; Type: SEQUENCE; Schema: public; Owner: -
--

CREATE SEQUENCE public.skywatch_inquiries_id_seq
    AS integer
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


--
-- Name: skywatch_inquiries_id_seq; Type: SEQUENCE OWNED BY; Schema: public; Owner: -
--

ALTER SEQUENCE public.skywatch_inquiries_id_seq OWNED BY public.skywatch_inquiries.id;


--
-- Name: skywatch_inquiry_vectors; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.skywatch_inquiry_vectors (
    id integer NOT NULL,
    inquiry_id integer NOT NULL,
    chunk_index integer DEFAULT 0 NOT NULL,
    chunk_text text,
    embedding public.vector(1024),
    created_at timestamp with time zone DEFAULT now() NOT NULL
);


--
-- Name: skywatch_inquiry_vectors_id_seq; Type: SEQUENCE; Schema: public; Owner: -
--

CREATE SEQUENCE public.skywatch_inquiry_vectors_id_seq
    AS integer
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


--
-- Name: skywatch_inquiry_vectors_id_seq; Type: SEQUENCE OWNED BY; Schema: public; Owner: -
--

ALTER SEQUENCE public.skywatch_inquiry_vectors_id_seq OWNED BY public.skywatch_inquiry_vectors.id;


--
-- Name: skywatch_issue_comments; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.skywatch_issue_comments (
    id integer NOT NULL,
    issue_id integer NOT NULL,
    content text NOT NULL,
    is_certified boolean DEFAULT false NOT NULL,
    created_by integer,
    created_at timestamp with time zone DEFAULT now() NOT NULL,
    is_deleted boolean DEFAULT false NOT NULL
);


--
-- Name: skywatch_issue_comments_id_seq; Type: SEQUENCE; Schema: public; Owner: -
--

CREATE SEQUENCE public.skywatch_issue_comments_id_seq
    AS integer
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


--
-- Name: skywatch_issue_comments_id_seq; Type: SEQUENCE OWNED BY; Schema: public; Owner: -
--

ALTER SEQUENCE public.skywatch_issue_comments_id_seq OWNED BY public.skywatch_issue_comments.id;


--
-- Name: skywatch_issue_vectors; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.skywatch_issue_vectors (
    id integer NOT NULL,
    issue_id integer NOT NULL,
    chunk_index integer DEFAULT 0 NOT NULL,
    chunk_text text,
    embedding public.vector(1024),
    created_at timestamp with time zone DEFAULT now() NOT NULL
);


--
-- Name: skywatch_issue_vectors_id_seq; Type: SEQUENCE; Schema: public; Owner: -
--

CREATE SEQUENCE public.skywatch_issue_vectors_id_seq
    AS integer
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


--
-- Name: skywatch_issue_vectors_id_seq; Type: SEQUENCE OWNED BY; Schema: public; Owner: -
--

ALTER SEQUENCE public.skywatch_issue_vectors_id_seq OWNED BY public.skywatch_issue_vectors.id;


--
-- Name: skywatch_issues; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.skywatch_issues (
    id integer NOT NULL,
    source_seq integer,
    kac_pr_no character varying(20),
    lm_pr_no character varying(50),
    title character varying(500) NOT NULL,
    content text,
    status character varying(20) DEFAULT '진행중'::character varying NOT NULL,
    acc_type character varying(5),
    keyword character varying(200),
    version character varying(100),
    mod_version character varying(100),
    reg_date date NOT NULL,
    action_date date,
    acc_pr character varying(50),
    created_by integer,
    assigned_to integer,
    created_at timestamp with time zone DEFAULT now() NOT NULL,
    updated_at timestamp with time zone DEFAULT now() NOT NULL,
    last_edited_by integer,
    is_deleted boolean DEFAULT false NOT NULL,
    deleted_by integer,
    deleted_at timestamp with time zone
);


--
-- Name: skywatch_issues_id_seq; Type: SEQUENCE; Schema: public; Owner: -
--

CREATE SEQUENCE public.skywatch_issues_id_seq
    AS integer
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


--
-- Name: skywatch_issues_id_seq; Type: SEQUENCE OWNED BY; Schema: public; Owner: -
--

ALTER SEQUENCE public.skywatch_issues_id_seq OWNED BY public.skywatch_issues.id;


--
-- Name: skywatch_leave_requests; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.skywatch_leave_requests (
    id integer NOT NULL,
    user_id integer NOT NULL,
    date_from date NOT NULL,
    date_to date NOT NULL,
    reason text,
    status character varying(20) DEFAULT 'pending'::character varying NOT NULL,
    approved_by integer,
    created_at timestamp with time zone DEFAULT now() NOT NULL,
    CONSTRAINT skywatch_leave_requests_status_check CHECK (((status)::text = ANY (ARRAY[('pending'::character varying)::text, ('approved'::character varying)::text, ('rejected'::character varying)::text])))
);


--
-- Name: skywatch_leave_requests_id_seq; Type: SEQUENCE; Schema: public; Owner: -
--

CREATE SEQUENCE public.skywatch_leave_requests_id_seq
    AS integer
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


--
-- Name: skywatch_leave_requests_id_seq; Type: SEQUENCE OWNED BY; Schema: public; Owner: -
--

ALTER SEQUENCE public.skywatch_leave_requests_id_seq OWNED BY public.skywatch_leave_requests.id;


--
-- Name: skywatch_log_acknowledgments; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.skywatch_log_acknowledgments (
    log_id integer NOT NULL,
    user_id integer NOT NULL,
    acked_at timestamp with time zone DEFAULT now() NOT NULL
);


--
-- Name: skywatch_log_cards; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.skywatch_log_cards (
    id integer NOT NULL,
    log_id integer NOT NULL,
    category_id integer,
    "position" integer DEFAULT 0 NOT NULL,
    title character varying(255),
    content text,
    status character varying(20) DEFAULT 'open'::character varying NOT NULL,
    completed_by integer,
    completed_at timestamp with time zone,
    status_changed_by integer,
    status_changed_at timestamp with time zone,
    created_by integer NOT NULL,
    last_edited_by integer,
    created_at timestamp with time zone DEFAULT now() NOT NULL,
    updated_at timestamp with time zone DEFAULT now() NOT NULL,
    is_deleted boolean DEFAULT false NOT NULL,
    deleted_by integer,
    deleted_at timestamp with time zone,
    CONSTRAINT skywatch_log_cards_status_check CHECK (((status)::text = ANY (ARRAY[('open'::character varying)::text, ('in_progress'::character varying)::text, ('hold'::character varying)::text, ('done'::character varying)::text, ('cancelled'::character varying)::text])))
);


--
-- Name: skywatch_log_cards_id_seq; Type: SEQUENCE; Schema: public; Owner: -
--

CREATE SEQUENCE public.skywatch_log_cards_id_seq
    AS integer
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


--
-- Name: skywatch_log_cards_id_seq; Type: SEQUENCE OWNED BY; Schema: public; Owner: -
--

ALTER SEQUENCE public.skywatch_log_cards_id_seq OWNED BY public.skywatch_log_cards.id;


--
-- Name: skywatch_log_participants; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.skywatch_log_participants (
    id integer NOT NULL,
    log_id integer NOT NULL,
    user_id integer NOT NULL,
    role character varying(20) NOT NULL,
    sub_for integer,
    note text,
    CONSTRAINT skywatch_log_participants_role_check CHECK (((role)::text = ANY (ARRAY[('primary'::character varying)::text, ('sub'::character varying)::text, ('support'::character varying)::text, ('overtime'::character varying)::text])))
);


--
-- Name: skywatch_log_participants_id_seq; Type: SEQUENCE; Schema: public; Owner: -
--

CREATE SEQUENCE public.skywatch_log_participants_id_seq
    AS integer
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


--
-- Name: skywatch_log_participants_id_seq; Type: SEQUENCE OWNED BY; Schema: public; Owner: -
--

ALTER SEQUENCE public.skywatch_log_participants_id_seq OWNED BY public.skywatch_log_participants.id;


--
-- Name: skywatch_log_reads; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.skywatch_log_reads (
    log_id integer NOT NULL,
    user_id integer NOT NULL,
    read_at timestamp with time zone DEFAULT now() NOT NULL
);


--
-- Name: skywatch_log_vectors; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.skywatch_log_vectors (
    id integer NOT NULL,
    log_id integer NOT NULL,
    chunk_no integer NOT NULL,
    chunk_text text NOT NULL,
    embedding text NOT NULL,
    model_name character varying(50) DEFAULT 'hash-384-v1'::character varying NOT NULL,
    updated_at timestamp with time zone DEFAULT now() NOT NULL,
    embedding_vector public.vector(1024)
);


--
-- Name: skywatch_log_vectors_id_seq; Type: SEQUENCE; Schema: public; Owner: -
--

CREATE SEQUENCE public.skywatch_log_vectors_id_seq
    AS integer
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


--
-- Name: skywatch_log_vectors_id_seq; Type: SEQUENCE OWNED BY; Schema: public; Owner: -
--

ALTER SEQUENCE public.skywatch_log_vectors_id_seq OWNED BY public.skywatch_log_vectors.id;


--
-- Name: skywatch_log_versions; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.skywatch_log_versions (
    id integer NOT NULL,
    log_id integer NOT NULL,
    editor_id integer NOT NULL,
    snapshot_json jsonb NOT NULL,
    edited_at timestamp with time zone DEFAULT now() NOT NULL
);


--
-- Name: skywatch_log_versions_id_seq; Type: SEQUENCE; Schema: public; Owner: -
--

CREATE SEQUENCE public.skywatch_log_versions_id_seq
    AS integer
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


--
-- Name: skywatch_log_versions_id_seq; Type: SEQUENCE OWNED BY; Schema: public; Owner: -
--

ALTER SEQUENCE public.skywatch_log_versions_id_seq OWNED BY public.skywatch_log_versions.id;


--
-- Name: skywatch_logs; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.skywatch_logs (
    id integer NOT NULL,
    author_id integer NOT NULL,
    created_by integer,
    last_edited_by integer,
    date date NOT NULL,
    shift_type character varying(10) NOT NULL,
    title character varying(255),
    created_at timestamp with time zone DEFAULT now() NOT NULL,
    updated_at timestamp with time zone DEFAULT now() NOT NULL,
    is_deleted boolean DEFAULT false NOT NULL,
    deleted_by integer,
    deleted_at timestamp with time zone,
    source_seq integer,
    tags text[] DEFAULT '{}'::text[],
    CONSTRAINT skywatch_logs_shift_type_check CHECK (((shift_type)::text = ANY ((ARRAY['주간'::character varying, '야간'::character varying, '주야'::character varying, '비번'::character varying, '휴가'::character varying, '공지'::character varying])::text[])))
);


--
-- Name: skywatch_logs_id_seq; Type: SEQUENCE; Schema: public; Owner: -
--

CREATE SEQUENCE public.skywatch_logs_id_seq
    AS integer
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


--
-- Name: skywatch_logs_id_seq; Type: SEQUENCE OWNED BY; Schema: public; Owner: -
--

ALTER SEQUENCE public.skywatch_logs_id_seq OWNED BY public.skywatch_logs.id;


--
-- Name: skywatch_notifications; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.skywatch_notifications (
    id integer NOT NULL,
    user_id integer NOT NULL,
    type character varying(30) NOT NULL,
    ref_type character varying(20),
    ref_id integer,
    body text,
    read_at timestamp with time zone,
    created_at timestamp with time zone DEFAULT now() NOT NULL
);


--
-- Name: skywatch_notifications_id_seq; Type: SEQUENCE; Schema: public; Owner: -
--

CREATE SEQUENCE public.skywatch_notifications_id_seq
    AS integer
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


--
-- Name: skywatch_notifications_id_seq; Type: SEQUENCE OWNED BY; Schema: public; Owner: -
--

ALTER SEQUENCE public.skywatch_notifications_id_seq OWNED BY public.skywatch_notifications.id;


--
-- Name: skywatch_pr_batch_attachments; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.skywatch_pr_batch_attachments (
    id integer NOT NULL,
    batch_id integer NOT NULL,
    doc_type character varying(20) DEFAULT '기타'::character varying NOT NULL,
    original_name character varying(500) NOT NULL,
    stored_name character varying(500) NOT NULL,
    file_size integer,
    uploaded_by integer,
    uploaded_at timestamp with time zone DEFAULT now() NOT NULL,
    is_deleted boolean DEFAULT false NOT NULL
);


--
-- Name: skywatch_pr_batch_attachments_id_seq; Type: SEQUENCE; Schema: public; Owner: -
--

CREATE SEQUENCE public.skywatch_pr_batch_attachments_id_seq
    AS integer
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


--
-- Name: skywatch_pr_batch_attachments_id_seq; Type: SEQUENCE OWNED BY; Schema: public; Owner: -
--

ALTER SEQUENCE public.skywatch_pr_batch_attachments_id_seq OWNED BY public.skywatch_pr_batch_attachments.id;


--
-- Name: skywatch_pr_batch_items; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.skywatch_pr_batch_items (
    id integer NOT NULL,
    batch_id integer NOT NULL,
    issue_id integer,
    kac_pr_no character varying(20),
    lm_pr_no character varying(50),
    title character varying(500) NOT NULL,
    agreed_content text,
    actual_fix text,
    verify_method text,
    item_status character varying(20) DEFAULT '대기'::character varying NOT NULL,
    sort_order integer DEFAULT 0 NOT NULL,
    created_at timestamp with time zone DEFAULT now() NOT NULL,
    updated_at timestamp with time zone DEFAULT now() NOT NULL,
    item_kind character varying(30) DEFAULT '개별 PR'::character varying NOT NULL
);


--
-- Name: skywatch_pr_batch_items_id_seq; Type: SEQUENCE; Schema: public; Owner: -
--

CREATE SEQUENCE public.skywatch_pr_batch_items_id_seq
    AS integer
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


--
-- Name: skywatch_pr_batch_items_id_seq; Type: SEQUENCE OWNED BY; Schema: public; Owner: -
--

ALTER SEQUENCE public.skywatch_pr_batch_items_id_seq OWNED BY public.skywatch_pr_batch_items.id;


--
-- Name: skywatch_pr_batches; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.skywatch_pr_batches (
    id integer NOT NULL,
    batch_no character varying(20) NOT NULL,
    sw_version character varying(50) NOT NULL,
    agreed_date date NOT NULL,
    target_date date,
    delivery_date date,
    verified_date date,
    status character varying(20) DEFAULT '합의중'::character varying NOT NULL,
    summary text,
    notes text,
    created_by integer,
    created_at timestamp with time zone DEFAULT now() NOT NULL,
    updated_at timestamp with time zone DEFAULT now() NOT NULL,
    is_deleted boolean DEFAULT false NOT NULL,
    deleted_by integer,
    deleted_at timestamp with time zone,
    previous_version character varying(50),
    skyline_version character varying(100),
    adaptation_version character varying(100),
    test_segment character varying(100)
);


--
-- Name: skywatch_pr_batches_id_seq; Type: SEQUENCE; Schema: public; Owner: -
--

CREATE SEQUENCE public.skywatch_pr_batches_id_seq
    AS integer
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


--
-- Name: skywatch_pr_batches_id_seq; Type: SEQUENCE OWNED BY; Schema: public; Owner: -
--

ALTER SEQUENCE public.skywatch_pr_batches_id_seq OWNED BY public.skywatch_pr_batches.id;


--
-- Name: skywatch_pr_verifications; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.skywatch_pr_verifications (
    id integer NOT NULL,
    item_id integer NOT NULL,
    user_id integer NOT NULL,
    round_no integer DEFAULT 1 NOT NULL,
    result character varying(20) DEFAULT '미제출'::character varying NOT NULL,
    test_case_code character varying(100),
    skyline_version character varying(100),
    adaptation_version character varying(100),
    tested_on date,
    started_at timestamp with time zone,
    ended_at timestamp with time zone,
    verify_method text,
    result_summary text,
    notes text,
    report_original_name character varying(500),
    report_stored_name character varying(500),
    report_file_size integer,
    report_uploaded_at timestamp with time zone,
    submitted_by integer,
    submitted_at timestamp with time zone,
    created_by integer,
    created_at timestamp with time zone DEFAULT now() NOT NULL,
    updated_at timestamp with time zone DEFAULT now() NOT NULL,
    is_deleted boolean DEFAULT false NOT NULL,
    approval_status character varying(20) DEFAULT '결재대기'::character varying NOT NULL,
    approved_by integer,
    approved_at timestamp with time zone,
    approval_note text,
    source_import_id integer,
    test_segment character varying(100),
    attendees character varying(200)
);


--
-- Name: skywatch_pr_verifications_id_seq; Type: SEQUENCE; Schema: public; Owner: -
--

CREATE SEQUENCE public.skywatch_pr_verifications_id_seq
    AS integer
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


--
-- Name: skywatch_pr_verifications_id_seq; Type: SEQUENCE OWNED BY; Schema: public; Owner: -
--

ALTER SEQUENCE public.skywatch_pr_verifications_id_seq OWNED BY public.skywatch_pr_verifications.id;


--
-- Name: skywatch_pr_workbook_imports; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.skywatch_pr_workbook_imports (
    id integer NOT NULL,
    batch_id integer NOT NULL,
    user_id integer NOT NULL,
    original_name character varying(500) NOT NULL,
    stored_name character varying(500) NOT NULL,
    file_size integer NOT NULL,
    file_hash character varying(64) NOT NULL,
    imported_items integer DEFAULT 0 NOT NULL,
    uploaded_at timestamp with time zone DEFAULT now() NOT NULL,
    updated_at timestamp with time zone DEFAULT now() NOT NULL
);


--
-- Name: skywatch_pr_workbook_imports_id_seq; Type: SEQUENCE; Schema: public; Owner: -
--

CREATE SEQUENCE public.skywatch_pr_workbook_imports_id_seq
    AS integer
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


--
-- Name: skywatch_pr_workbook_imports_id_seq; Type: SEQUENCE OWNED BY; Schema: public; Owner: -
--

ALTER SEQUENCE public.skywatch_pr_workbook_imports_id_seq OWNED BY public.skywatch_pr_workbook_imports.id;


--
-- Name: skywatch_recurring_task_templates; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.skywatch_recurring_task_templates (
    id integer NOT NULL,
    name character varying(255) NOT NULL,
    frequency character varying(20) NOT NULL,
    run_at_time character varying(5),
    days_of_week jsonb DEFAULT '[]'::jsonb NOT NULL,
    day_of_month integer,
    run_once_date date,
    template_content jsonb DEFAULT '{}'::jsonb NOT NULL,
    target_teams jsonb DEFAULT '[]'::jsonb NOT NULL,
    target_shift_types jsonb DEFAULT '[]'::jsonb NOT NULL,
    next_run_at timestamp with time zone,
    last_run_at timestamp with time zone,
    is_active boolean DEFAULT true NOT NULL,
    created_by integer,
    created_at timestamp with time zone DEFAULT now() NOT NULL,
    CONSTRAINT skywatch_recurring_task_templates_frequency_check CHECK (((frequency)::text = ANY (ARRAY[('daily'::character varying)::text, ('weekly'::character varying)::text, ('monthly'::character varying)::text, ('once'::character varying)::text])))
);


--
-- Name: skywatch_recurring_task_templates_id_seq; Type: SEQUENCE; Schema: public; Owner: -
--

CREATE SEQUENCE public.skywatch_recurring_task_templates_id_seq
    AS integer
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


--
-- Name: skywatch_recurring_task_templates_id_seq; Type: SEQUENCE OWNED BY; Schema: public; Owner: -
--

ALTER SEQUENCE public.skywatch_recurring_task_templates_id_seq OWNED BY public.skywatch_recurring_task_templates.id;


--
-- Name: skywatch_reindex_jobs; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.skywatch_reindex_jobs (
    id integer NOT NULL,
    job_id character varying(100) NOT NULL,
    model_name character varying(50) NOT NULL,
    status character varying(20) DEFAULT 'pending'::character varying NOT NULL,
    total_logs integer,
    processed_logs integer DEFAULT 0,
    progress_percent integer DEFAULT 0,
    error_message text,
    started_at timestamp with time zone,
    completed_at timestamp with time zone,
    created_at timestamp with time zone DEFAULT now() NOT NULL
);


--
-- Name: skywatch_reindex_jobs_id_seq; Type: SEQUENCE; Schema: public; Owner: -
--

CREATE SEQUENCE public.skywatch_reindex_jobs_id_seq
    AS integer
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


--
-- Name: skywatch_reindex_jobs_id_seq; Type: SEQUENCE OWNED BY; Schema: public; Owner: -
--

ALTER SEQUENCE public.skywatch_reindex_jobs_id_seq OWNED BY public.skywatch_reindex_jobs.id;


--
-- Name: skywatch_schedules; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.skywatch_schedules (
    id integer NOT NULL,
    team character varying(10) NOT NULL,
    date date NOT NULL,
    shift_type character varying(10) NOT NULL,
    capacity integer DEFAULT 1 NOT NULL,
    created_by integer,
    created_at timestamp with time zone DEFAULT now() NOT NULL,
    CONSTRAINT skywatch_schedules_shift_type_check CHECK (((shift_type)::text = ANY (ARRAY[('주간'::character varying)::text, ('야간'::character varying)::text, ('주야'::character varying)::text, ('비번'::character varying)::text, ('휴가'::character varying)::text]))),
    CONSTRAINT skywatch_schedules_team_check CHECK (((team)::text = ANY (ARRAY[('A'::character varying)::text, ('B'::character varying)::text, ('C'::character varying)::text, ('D'::character varying)::text, ('day'::character varying)::text])))
);


--
-- Name: skywatch_schedules_id_seq; Type: SEQUENCE; Schema: public; Owner: -
--

CREATE SEQUENCE public.skywatch_schedules_id_seq
    AS integer
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


--
-- Name: skywatch_schedules_id_seq; Type: SEQUENCE OWNED BY; Schema: public; Owner: -
--

ALTER SEQUENCE public.skywatch_schedules_id_seq OWNED BY public.skywatch_schedules.id;


--
-- Name: skywatch_search_suggestions; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.skywatch_search_suggestions (
    id integer NOT NULL,
    query_text character varying(200) NOT NULL,
    search_count integer DEFAULT 1 NOT NULL,
    result_count integer DEFAULT 0 NOT NULL,
    last_searched_at timestamp with time zone DEFAULT now() NOT NULL,
    created_at timestamp with time zone DEFAULT now() NOT NULL
);


--
-- Name: skywatch_search_suggestions_id_seq; Type: SEQUENCE; Schema: public; Owner: -
--

CREATE SEQUENCE public.skywatch_search_suggestions_id_seq
    AS integer
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


--
-- Name: skywatch_search_suggestions_id_seq; Type: SEQUENCE OWNED BY; Schema: public; Owner: -
--

ALTER SEQUENCE public.skywatch_search_suggestions_id_seq OWNED BY public.skywatch_search_suggestions.id;


--
-- Name: skywatch_sessions; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.skywatch_sessions (
    id character varying(128) NOT NULL,
    user_id integer NOT NULL,
    expires_at timestamp with time zone NOT NULL,
    created_at timestamp with time zone DEFAULT now() NOT NULL,
    last_seen_at timestamp with time zone DEFAULT now() NOT NULL
);


--
-- Name: skywatch_shift_carry_over; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.skywatch_shift_carry_over (
    id integer NOT NULL,
    user_id integer NOT NULL,
    entry_type character varying(10) NOT NULL,
    entry_date date NOT NULL,
    shift_type character varying(20),
    hours numeric(4,1) DEFAULT 0 NOT NULL,
    note text,
    created_at timestamp with time zone DEFAULT now() NOT NULL,
    CONSTRAINT skywatch_shift_carry_over_entry_type_check CHECK (((entry_type)::text = ANY (ARRAY[('earned'::character varying)::text, ('used'::character varying)::text])))
);


--
-- Name: skywatch_shift_carry_over_id_seq; Type: SEQUENCE; Schema: public; Owner: -
--

CREATE SEQUENCE public.skywatch_shift_carry_over_id_seq
    AS integer
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


--
-- Name: skywatch_shift_carry_over_id_seq; Type: SEQUENCE OWNED BY; Schema: public; Owner: -
--

ALTER SEQUENCE public.skywatch_shift_carry_over_id_seq OWNED BY public.skywatch_shift_carry_over.id;


--
-- Name: skywatch_shift_carry_raw; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.skywatch_shift_carry_raw (
    id integer NOT NULL,
    year character varying(10) NOT NULL,
    name character varying(100) NOT NULL,
    hours numeric(6,1) NOT NULL
);


--
-- Name: skywatch_shift_carry_raw_id_seq; Type: SEQUENCE; Schema: public; Owner: -
--

CREATE SEQUENCE public.skywatch_shift_carry_raw_id_seq
    AS integer
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


--
-- Name: skywatch_shift_carry_raw_id_seq; Type: SEQUENCE OWNED BY; Schema: public; Owner: -
--

ALTER SEQUENCE public.skywatch_shift_carry_raw_id_seq OWNED BY public.skywatch_shift_carry_raw.id;


--
-- Name: skywatch_shift_data; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.skywatch_shift_data (
    date date NOT NULL,
    memo jsonb DEFAULT '[]'::jsonb NOT NULL,
    shift_code text,
    repeat_type text,
    updated_at timestamp with time zone DEFAULT now(),
    data_date date
);


--
-- Name: skywatch_shift_notices; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.skywatch_shift_notices (
    id integer NOT NULL,
    text text NOT NULL,
    start_date date NOT NULL,
    end_date date NOT NULL,
    created_by integer,
    created_at timestamp with time zone DEFAULT now() NOT NULL,
    deleted_at timestamp with time zone
);


--
-- Name: skywatch_shift_notices_id_seq; Type: SEQUENCE; Schema: public; Owner: -
--

CREATE SEQUENCE public.skywatch_shift_notices_id_seq
    AS integer
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


--
-- Name: skywatch_shift_notices_id_seq; Type: SEQUENCE OWNED BY; Schema: public; Owner: -
--

ALTER SEQUENCE public.skywatch_shift_notices_id_seq OWNED BY public.skywatch_shift_notices.id;


--
-- Name: skywatch_shift_overrides; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.skywatch_shift_overrides (
    id integer NOT NULL,
    date date NOT NULL,
    original_user_id integer NOT NULL,
    actual_user_id integer NOT NULL,
    type character varying(20) NOT NULL,
    swap_group_id uuid,
    approved_by integer,
    note text,
    created_at timestamp with time zone DEFAULT now() NOT NULL,
    CONSTRAINT skywatch_shift_overrides_type_check CHECK (((type)::text = ANY (ARRAY[('swap'::character varying)::text, ('substitution'::character varying)::text])))
);


--
-- Name: skywatch_shift_overrides_id_seq; Type: SEQUENCE; Schema: public; Owner: -
--

CREATE SEQUENCE public.skywatch_shift_overrides_id_seq
    AS integer
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


--
-- Name: skywatch_shift_overrides_id_seq; Type: SEQUENCE OWNED BY; Schema: public; Owner: -
--

ALTER SEQUENCE public.skywatch_shift_overrides_id_seq OWNED BY public.skywatch_shift_overrides.id;


--
-- Name: skywatch_shift_staff_master; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.skywatch_shift_staff_master (
    id integer NOT NULL,
    name character varying(100) NOT NULL,
    emp_no integer NOT NULL,
    grade character varying(20),
    shift character varying(20),
    from_date date,
    to_date date,
    no_excel boolean NOT NULL
);


--
-- Name: skywatch_shift_staff_master_id_seq; Type: SEQUENCE; Schema: public; Owner: -
--

CREATE SEQUENCE public.skywatch_shift_staff_master_id_seq
    AS integer
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


--
-- Name: skywatch_shift_staff_master_id_seq; Type: SEQUENCE OWNED BY; Schema: public; Owner: -
--

ALTER SEQUENCE public.skywatch_shift_staff_master_id_seq OWNED BY public.skywatch_shift_staff_master.id;


--
-- Name: skywatch_shift_staff_memos; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.skywatch_shift_staff_memos (
    id integer NOT NULL,
    date date NOT NULL,
    user_id integer NOT NULL,
    memo_type character varying(20) NOT NULL,
    memo_text text,
    created_at timestamp with time zone DEFAULT now() NOT NULL,
    updated_at timestamp with time zone DEFAULT now() NOT NULL,
    CONSTRAINT skywatch_shift_staff_memos_memo_type_check CHECK ((((memo_type)::text ~ '^M[0-9]{4}$'::text) OR ((memo_type)::text ~ '^home_'::text) OR ((memo_type)::text = ANY (ARRAY[('연차'::character varying)::text, ('대체'::character varying)::text, ('대휴'::character varying)::text, ('교육'::character varying)::text, ('출장'::character varying)::text, ('기타'::character varying)::text, ('알림'::character varying)::text]))))
);


--
-- Name: skywatch_shift_staff_memos_id_seq; Type: SEQUENCE; Schema: public; Owner: -
--

CREATE SEQUENCE public.skywatch_shift_staff_memos_id_seq
    AS integer
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


--
-- Name: skywatch_shift_staff_memos_id_seq; Type: SEQUENCE OWNED BY; Schema: public; Owner: -
--

ALTER SEQUENCE public.skywatch_shift_staff_memos_id_seq OWNED BY public.skywatch_shift_staff_memos.id;


--
-- Name: skywatch_tasks; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.skywatch_tasks (
    id integer NOT NULL,
    title character varying(255) NOT NULL,
    body text,
    due_date timestamp with time zone,
    importance character varying(10) DEFAULT 'normal'::character varying NOT NULL,
    sender_id integer NOT NULL,
    recipients jsonb DEFAULT '[]'::jsonb NOT NULL,
    recipients_mode character varying(20) DEFAULT 'individual'::character varying NOT NULL,
    target_teams jsonb DEFAULT '[]'::jsonb NOT NULL,
    completed_by jsonb DEFAULT '[]'::jsonb NOT NULL,
    linked_card_id integer,
    created_at timestamp with time zone DEFAULT now() NOT NULL,
    updated_at timestamp with time zone DEFAULT now() NOT NULL,
    is_deleted boolean DEFAULT false NOT NULL,
    deleted_by integer,
    deleted_at timestamp with time zone,
    is_archived boolean DEFAULT false NOT NULL,
    archived_at timestamp with time zone,
    CONSTRAINT skywatch_tasks_importance_check CHECK (((importance)::text = ANY (ARRAY[('high'::character varying)::text, ('normal'::character varying)::text, ('low'::character varying)::text]))),
    CONSTRAINT skywatch_tasks_recipients_mode_check CHECK (((recipients_mode)::text = ANY (ARRAY[('all'::character varying)::text, ('teams'::character varying)::text, ('individual'::character varying)::text])))
);


--
-- Name: skywatch_tasks_id_seq; Type: SEQUENCE; Schema: public; Owner: -
--

CREATE SEQUENCE public.skywatch_tasks_id_seq
    AS integer
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


--
-- Name: skywatch_tasks_id_seq; Type: SEQUENCE OWNED BY; Schema: public; Owner: -
--

ALTER SEQUENCE public.skywatch_tasks_id_seq OWNED BY public.skywatch_tasks.id;


--
-- Name: skywatch_tech_doc_attachments; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.skywatch_tech_doc_attachments (
    id integer NOT NULL,
    tech_doc_id integer NOT NULL,
    legacy_doc_seq integer,
    original_name character varying(500) NOT NULL,
    stored_name character varying(500) NOT NULL,
    file_extension character varying(20),
    content_text text,
    reg_date date,
    uploaded_by integer,
    created_at timestamp with time zone DEFAULT now() NOT NULL,
    is_deleted boolean DEFAULT false NOT NULL
);


--
-- Name: skywatch_tech_doc_attachments_id_seq; Type: SEQUENCE; Schema: public; Owner: -
--

CREATE SEQUENCE public.skywatch_tech_doc_attachments_id_seq
    AS integer
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


--
-- Name: skywatch_tech_doc_attachments_id_seq; Type: SEQUENCE OWNED BY; Schema: public; Owner: -
--

ALTER SEQUENCE public.skywatch_tech_doc_attachments_id_seq OWNED BY public.skywatch_tech_doc_attachments.id;


--
-- Name: skywatch_tech_doc_categories; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.skywatch_tech_doc_categories (
    id integer NOT NULL,
    project_code character varying(30) NOT NULL,
    category_code character varying(20) NOT NULL,
    name character varying(100) NOT NULL,
    sort_order integer DEFAULT 0 NOT NULL,
    is_active boolean DEFAULT true NOT NULL
);


--
-- Name: skywatch_tech_doc_categories_id_seq; Type: SEQUENCE; Schema: public; Owner: -
--

CREATE SEQUENCE public.skywatch_tech_doc_categories_id_seq
    AS integer
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


--
-- Name: skywatch_tech_doc_categories_id_seq; Type: SEQUENCE OWNED BY; Schema: public; Owner: -
--

ALTER SEQUENCE public.skywatch_tech_doc_categories_id_seq OWNED BY public.skywatch_tech_doc_categories.id;


--
-- Name: skywatch_tech_doc_vectors; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.skywatch_tech_doc_vectors (
    id integer NOT NULL,
    tech_doc_id integer NOT NULL,
    chunk_index integer DEFAULT 0 NOT NULL,
    chunk_text text,
    embedding public.vector(1024)
);


--
-- Name: skywatch_tech_doc_vectors_id_seq; Type: SEQUENCE; Schema: public; Owner: -
--

CREATE SEQUENCE public.skywatch_tech_doc_vectors_id_seq
    AS integer
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


--
-- Name: skywatch_tech_doc_vectors_id_seq; Type: SEQUENCE OWNED BY; Schema: public; Owner: -
--

ALTER SEQUENCE public.skywatch_tech_doc_vectors_id_seq OWNED BY public.skywatch_tech_doc_vectors.id;


--
-- Name: skywatch_tech_docs; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.skywatch_tech_docs (
    id integer NOT NULL,
    legacy_seq integer,
    record_date date,
    project_code character varying(30),
    category_code character varying(20),
    title character varying(500),
    content text,
    summary text,
    detail_summary text,
    doc_type character varying(100),
    adapt_version character varying(50),
    service_date date,
    reference text,
    orig_user_id character varying(20),
    author_id integer,
    created_at timestamp with time zone DEFAULT now() NOT NULL,
    updated_at timestamp with time zone DEFAULT now() NOT NULL,
    created_by integer,
    last_edited_by integer,
    is_deleted boolean DEFAULT false NOT NULL
);


--
-- Name: skywatch_tech_docs_id_seq; Type: SEQUENCE; Schema: public; Owner: -
--

CREATE SEQUENCE public.skywatch_tech_docs_id_seq
    AS integer
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


--
-- Name: skywatch_tech_docs_id_seq; Type: SEQUENCE OWNED BY; Schema: public; Owner: -
--

ALTER SEQUENCE public.skywatch_tech_docs_id_seq OWNED BY public.skywatch_tech_docs.id;


--
-- Name: skywatch_users; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.skywatch_users (
    id integer NOT NULL,
    name character varying(50) NOT NULL,
    login_id character varying(20) NOT NULL,
    role character varying(20) NOT NULL,
    team character varying(10) NOT NULL,
    grade character varying(20),
    password_hash character varying(255) DEFAULT ''::character varying NOT NULL,
    salt character varying(100) DEFAULT ''::character varying NOT NULL,
    is_active boolean DEFAULT true NOT NULL,
    sort_order integer DEFAULT 0 NOT NULL,
    joined_at date,
    resigned_at date,
    note text,
    no_excel boolean DEFAULT false NOT NULL,
    created_by integer,
    created_at timestamp with time zone DEFAULT now() NOT NULL,
    updated_at timestamp with time zone DEFAULT now() NOT NULL,
    CONSTRAINT skywatch_users_role_check CHECK (((role)::text = ANY (ARRAY[('shift_worker'::character varying)::text, ('day_worker'::character varying)::text, ('admin'::character varying)::text]))),
    CONSTRAINT skywatch_users_team_check CHECK (((team)::text = ANY (ARRAY[('A'::character varying)::text, ('B'::character varying)::text, ('C'::character varying)::text, ('D'::character varying)::text, ('day'::character varying)::text])))
);


--
-- Name: skywatch_users_id_seq; Type: SEQUENCE; Schema: public; Owner: -
--

CREATE SEQUENCE public.skywatch_users_id_seq
    AS integer
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


--
-- Name: skywatch_users_id_seq; Type: SEQUENCE OWNED BY; Schema: public; Owner: -
--

ALTER SEQUENCE public.skywatch_users_id_seq OWNED BY public.skywatch_users.id;


--
-- Name: skywatch_work_thread_cards; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.skywatch_work_thread_cards (
    card_id integer NOT NULL,
    thread_id integer NOT NULL,
    origin character varying(20) DEFAULT 'new'::character varying NOT NULL,
    linked_by integer,
    linked_at timestamp with time zone DEFAULT now() NOT NULL
);


--
-- Name: skywatch_work_thread_phases; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.skywatch_work_thread_phases (
    id integer NOT NULL,
    thread_id integer NOT NULL,
    seq integer DEFAULT 0 NOT NULL,
    name character varying(50) NOT NULL,
    start_month character varying(7) NOT NULL,
    end_month character varying(7) NOT NULL
);


--
-- Name: skywatch_work_thread_phases_id_seq; Type: SEQUENCE; Schema: public; Owner: -
--

CREATE SEQUENCE public.skywatch_work_thread_phases_id_seq
    AS integer
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


--
-- Name: skywatch_work_thread_phases_id_seq; Type: SEQUENCE OWNED BY; Schema: public; Owner: -
--

ALTER SEQUENCE public.skywatch_work_thread_phases_id_seq OWNED BY public.skywatch_work_thread_phases.id;


--
-- Name: skywatch_work_threads; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.skywatch_work_threads (
    id integer NOT NULL,
    kind character varying(10) DEFAULT 'thread'::character varying NOT NULL,
    title character varying(255) NOT NULL,
    category_id integer,
    status character varying(10) DEFAULT 'open'::character varying NOT NULL,
    owner_id integer,
    started_on date NOT NULL,
    closed_on date,
    current_phase integer DEFAULT 0 NOT NULL,
    recur_month integer,
    source_thread_id integer,
    created_by integer,
    created_at timestamp with time zone DEFAULT now() NOT NULL,
    updated_at timestamp with time zone DEFAULT now() NOT NULL,
    is_deleted boolean DEFAULT false NOT NULL
);


--
-- Name: skywatch_work_threads_id_seq; Type: SEQUENCE; Schema: public; Owner: -
--

CREATE SEQUENCE public.skywatch_work_threads_id_seq
    AS integer
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


--
-- Name: skywatch_work_threads_id_seq; Type: SEQUENCE OWNED BY; Schema: public; Owner: -
--

ALTER SEQUENCE public.skywatch_work_threads_id_seq OWNED BY public.skywatch_work_threads.id;


--
-- Name: skywatch_attachments id; Type: DEFAULT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.skywatch_attachments ALTER COLUMN id SET DEFAULT nextval('public.skywatch_attachments_id_seq'::regclass);


--
-- Name: skywatch_backup_logs id; Type: DEFAULT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.skywatch_backup_logs ALTER COLUMN id SET DEFAULT nextval('public.skywatch_backup_logs_id_seq'::regclass);


--
-- Name: skywatch_card_categories id; Type: DEFAULT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.skywatch_card_categories ALTER COLUMN id SET DEFAULT nextval('public.skywatch_card_categories_id_seq'::regclass);


--
-- Name: skywatch_card_links id; Type: DEFAULT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.skywatch_card_links ALTER COLUMN id SET DEFAULT nextval('public.skywatch_card_links_id_seq'::regclass);


--
-- Name: skywatch_card_statuses id; Type: DEFAULT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.skywatch_card_statuses ALTER COLUMN id SET DEFAULT nextval('public.skywatch_card_statuses_id_seq'::regclass);


--
-- Name: skywatch_card_vectors id; Type: DEFAULT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.skywatch_card_vectors ALTER COLUMN id SET DEFAULT nextval('public.skywatch_card_vectors_id_seq'::regclass);


--
-- Name: skywatch_comments id; Type: DEFAULT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.skywatch_comments ALTER COLUMN id SET DEFAULT nextval('public.skywatch_comments_id_seq'::regclass);


--
-- Name: skywatch_commute_months id; Type: DEFAULT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.skywatch_commute_months ALTER COLUMN id SET DEFAULT nextval('public.skywatch_commute_months_id_seq'::regclass);


--
-- Name: skywatch_configs id; Type: DEFAULT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.skywatch_configs ALTER COLUMN id SET DEFAULT nextval('public.skywatch_configs_id_seq'::regclass);


--
-- Name: skywatch_inquiries id; Type: DEFAULT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.skywatch_inquiries ALTER COLUMN id SET DEFAULT nextval('public.skywatch_inquiries_id_seq'::regclass);


--
-- Name: skywatch_inquiry_vectors id; Type: DEFAULT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.skywatch_inquiry_vectors ALTER COLUMN id SET DEFAULT nextval('public.skywatch_inquiry_vectors_id_seq'::regclass);


--
-- Name: skywatch_issue_comments id; Type: DEFAULT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.skywatch_issue_comments ALTER COLUMN id SET DEFAULT nextval('public.skywatch_issue_comments_id_seq'::regclass);


--
-- Name: skywatch_issue_vectors id; Type: DEFAULT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.skywatch_issue_vectors ALTER COLUMN id SET DEFAULT nextval('public.skywatch_issue_vectors_id_seq'::regclass);


--
-- Name: skywatch_issues id; Type: DEFAULT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.skywatch_issues ALTER COLUMN id SET DEFAULT nextval('public.skywatch_issues_id_seq'::regclass);


--
-- Name: skywatch_leave_requests id; Type: DEFAULT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.skywatch_leave_requests ALTER COLUMN id SET DEFAULT nextval('public.skywatch_leave_requests_id_seq'::regclass);


--
-- Name: skywatch_log_cards id; Type: DEFAULT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.skywatch_log_cards ALTER COLUMN id SET DEFAULT nextval('public.skywatch_log_cards_id_seq'::regclass);


--
-- Name: skywatch_log_participants id; Type: DEFAULT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.skywatch_log_participants ALTER COLUMN id SET DEFAULT nextval('public.skywatch_log_participants_id_seq'::regclass);


--
-- Name: skywatch_log_vectors id; Type: DEFAULT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.skywatch_log_vectors ALTER COLUMN id SET DEFAULT nextval('public.skywatch_log_vectors_id_seq'::regclass);


--
-- Name: skywatch_log_versions id; Type: DEFAULT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.skywatch_log_versions ALTER COLUMN id SET DEFAULT nextval('public.skywatch_log_versions_id_seq'::regclass);


--
-- Name: skywatch_logs id; Type: DEFAULT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.skywatch_logs ALTER COLUMN id SET DEFAULT nextval('public.skywatch_logs_id_seq'::regclass);


--
-- Name: skywatch_notifications id; Type: DEFAULT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.skywatch_notifications ALTER COLUMN id SET DEFAULT nextval('public.skywatch_notifications_id_seq'::regclass);


--
-- Name: skywatch_pr_batch_attachments id; Type: DEFAULT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.skywatch_pr_batch_attachments ALTER COLUMN id SET DEFAULT nextval('public.skywatch_pr_batch_attachments_id_seq'::regclass);


--
-- Name: skywatch_pr_batch_items id; Type: DEFAULT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.skywatch_pr_batch_items ALTER COLUMN id SET DEFAULT nextval('public.skywatch_pr_batch_items_id_seq'::regclass);


--
-- Name: skywatch_pr_batches id; Type: DEFAULT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.skywatch_pr_batches ALTER COLUMN id SET DEFAULT nextval('public.skywatch_pr_batches_id_seq'::regclass);


--
-- Name: skywatch_pr_verifications id; Type: DEFAULT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.skywatch_pr_verifications ALTER COLUMN id SET DEFAULT nextval('public.skywatch_pr_verifications_id_seq'::regclass);


--
-- Name: skywatch_pr_workbook_imports id; Type: DEFAULT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.skywatch_pr_workbook_imports ALTER COLUMN id SET DEFAULT nextval('public.skywatch_pr_workbook_imports_id_seq'::regclass);


--
-- Name: skywatch_recurring_task_templates id; Type: DEFAULT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.skywatch_recurring_task_templates ALTER COLUMN id SET DEFAULT nextval('public.skywatch_recurring_task_templates_id_seq'::regclass);


--
-- Name: skywatch_reindex_jobs id; Type: DEFAULT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.skywatch_reindex_jobs ALTER COLUMN id SET DEFAULT nextval('public.skywatch_reindex_jobs_id_seq'::regclass);


--
-- Name: skywatch_schedules id; Type: DEFAULT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.skywatch_schedules ALTER COLUMN id SET DEFAULT nextval('public.skywatch_schedules_id_seq'::regclass);


--
-- Name: skywatch_search_suggestions id; Type: DEFAULT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.skywatch_search_suggestions ALTER COLUMN id SET DEFAULT nextval('public.skywatch_search_suggestions_id_seq'::regclass);


--
-- Name: skywatch_shift_carry_over id; Type: DEFAULT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.skywatch_shift_carry_over ALTER COLUMN id SET DEFAULT nextval('public.skywatch_shift_carry_over_id_seq'::regclass);


--
-- Name: skywatch_shift_carry_raw id; Type: DEFAULT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.skywatch_shift_carry_raw ALTER COLUMN id SET DEFAULT nextval('public.skywatch_shift_carry_raw_id_seq'::regclass);


--
-- Name: skywatch_shift_notices id; Type: DEFAULT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.skywatch_shift_notices ALTER COLUMN id SET DEFAULT nextval('public.skywatch_shift_notices_id_seq'::regclass);


--
-- Name: skywatch_shift_overrides id; Type: DEFAULT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.skywatch_shift_overrides ALTER COLUMN id SET DEFAULT nextval('public.skywatch_shift_overrides_id_seq'::regclass);


--
-- Name: skywatch_shift_staff_master id; Type: DEFAULT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.skywatch_shift_staff_master ALTER COLUMN id SET DEFAULT nextval('public.skywatch_shift_staff_master_id_seq'::regclass);


--
-- Name: skywatch_shift_staff_memos id; Type: DEFAULT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.skywatch_shift_staff_memos ALTER COLUMN id SET DEFAULT nextval('public.skywatch_shift_staff_memos_id_seq'::regclass);


--
-- Name: skywatch_tasks id; Type: DEFAULT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.skywatch_tasks ALTER COLUMN id SET DEFAULT nextval('public.skywatch_tasks_id_seq'::regclass);


--
-- Name: skywatch_tech_doc_attachments id; Type: DEFAULT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.skywatch_tech_doc_attachments ALTER COLUMN id SET DEFAULT nextval('public.skywatch_tech_doc_attachments_id_seq'::regclass);


--
-- Name: skywatch_tech_doc_categories id; Type: DEFAULT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.skywatch_tech_doc_categories ALTER COLUMN id SET DEFAULT nextval('public.skywatch_tech_doc_categories_id_seq'::regclass);


--
-- Name: skywatch_tech_doc_vectors id; Type: DEFAULT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.skywatch_tech_doc_vectors ALTER COLUMN id SET DEFAULT nextval('public.skywatch_tech_doc_vectors_id_seq'::regclass);


--
-- Name: skywatch_tech_docs id; Type: DEFAULT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.skywatch_tech_docs ALTER COLUMN id SET DEFAULT nextval('public.skywatch_tech_docs_id_seq'::regclass);


--
-- Name: skywatch_users id; Type: DEFAULT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.skywatch_users ALTER COLUMN id SET DEFAULT nextval('public.skywatch_users_id_seq'::regclass);


--
-- Name: skywatch_work_thread_phases id; Type: DEFAULT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.skywatch_work_thread_phases ALTER COLUMN id SET DEFAULT nextval('public.skywatch_work_thread_phases_id_seq'::regclass);


--
-- Name: skywatch_work_threads id; Type: DEFAULT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.skywatch_work_threads ALTER COLUMN id SET DEFAULT nextval('public.skywatch_work_threads_id_seq'::regclass);


--
-- Name: alembic_version alembic_version_pkc; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.alembic_version
    ADD CONSTRAINT alembic_version_pkc PRIMARY KEY (version_num);


--
-- Name: skywatch_shift_data shift_data_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.skywatch_shift_data
    ADD CONSTRAINT shift_data_pkey PRIMARY KEY (date);


--
-- Name: skywatch_attachments skywatch_attachments_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.skywatch_attachments
    ADD CONSTRAINT skywatch_attachments_pkey PRIMARY KEY (id);


--
-- Name: skywatch_backup_logs skywatch_backup_logs_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.skywatch_backup_logs
    ADD CONSTRAINT skywatch_backup_logs_pkey PRIMARY KEY (id);


--
-- Name: skywatch_card_categories skywatch_card_categories_name_key; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.skywatch_card_categories
    ADD CONSTRAINT skywatch_card_categories_name_key UNIQUE (name);


--
-- Name: skywatch_card_categories skywatch_card_categories_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.skywatch_card_categories
    ADD CONSTRAINT skywatch_card_categories_pkey PRIMARY KEY (id);


--
-- Name: skywatch_card_links skywatch_card_links_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.skywatch_card_links
    ADD CONSTRAINT skywatch_card_links_pkey PRIMARY KEY (id);


--
-- Name: skywatch_card_memo_checks skywatch_card_memo_checks_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.skywatch_card_memo_checks
    ADD CONSTRAINT skywatch_card_memo_checks_pkey PRIMARY KEY (card_id, user_id);


--
-- Name: skywatch_card_memos skywatch_card_memos_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.skywatch_card_memos
    ADD CONSTRAINT skywatch_card_memos_pkey PRIMARY KEY (card_id);


--
-- Name: skywatch_card_status_backup_044 skywatch_card_status_backup_044_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.skywatch_card_status_backup_044
    ADD CONSTRAINT skywatch_card_status_backup_044_pkey PRIMARY KEY (card_id);


--
-- Name: skywatch_card_statuses skywatch_card_statuses_key_key; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.skywatch_card_statuses
    ADD CONSTRAINT skywatch_card_statuses_key_key UNIQUE (key);


--
-- Name: skywatch_card_statuses skywatch_card_statuses_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.skywatch_card_statuses
    ADD CONSTRAINT skywatch_card_statuses_pkey PRIMARY KEY (id);


--
-- Name: skywatch_card_vectors skywatch_card_vectors_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.skywatch_card_vectors
    ADD CONSTRAINT skywatch_card_vectors_pkey PRIMARY KEY (id);


--
-- Name: skywatch_comment_reactions skywatch_comment_reactions_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.skywatch_comment_reactions
    ADD CONSTRAINT skywatch_comment_reactions_pkey PRIMARY KEY (comment_id, user_id, emoji);


--
-- Name: skywatch_comments skywatch_comments_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.skywatch_comments
    ADD CONSTRAINT skywatch_comments_pkey PRIMARY KEY (id);


--
-- Name: skywatch_commute_months skywatch_commute_months_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.skywatch_commute_months
    ADD CONSTRAINT skywatch_commute_months_pkey PRIMARY KEY (id);


--
-- Name: skywatch_commute_months skywatch_commute_months_ym_key; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.skywatch_commute_months
    ADD CONSTRAINT skywatch_commute_months_ym_key UNIQUE (ym);


--
-- Name: skywatch_configs skywatch_configs_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.skywatch_configs
    ADD CONSTRAINT skywatch_configs_pkey PRIMARY KEY (id);


--
-- Name: skywatch_configs skywatch_configs_setting_key_key; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.skywatch_configs
    ADD CONSTRAINT skywatch_configs_setting_key_key UNIQUE (setting_key);


--
-- Name: skywatch_inquiries skywatch_inquiries_inquiry_no_key; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.skywatch_inquiries
    ADD CONSTRAINT skywatch_inquiries_inquiry_no_key UNIQUE (inquiry_no);


--
-- Name: skywatch_inquiries skywatch_inquiries_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.skywatch_inquiries
    ADD CONSTRAINT skywatch_inquiries_pkey PRIMARY KEY (id);


--
-- Name: skywatch_inquiry_vectors skywatch_inquiry_vectors_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.skywatch_inquiry_vectors
    ADD CONSTRAINT skywatch_inquiry_vectors_pkey PRIMARY KEY (id);


--
-- Name: skywatch_issue_comments skywatch_issue_comments_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.skywatch_issue_comments
    ADD CONSTRAINT skywatch_issue_comments_pkey PRIMARY KEY (id);


--
-- Name: skywatch_issue_vectors skywatch_issue_vectors_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.skywatch_issue_vectors
    ADD CONSTRAINT skywatch_issue_vectors_pkey PRIMARY KEY (id);


--
-- Name: skywatch_issues skywatch_issues_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.skywatch_issues
    ADD CONSTRAINT skywatch_issues_pkey PRIMARY KEY (id);


--
-- Name: skywatch_issues skywatch_issues_source_seq_key; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.skywatch_issues
    ADD CONSTRAINT skywatch_issues_source_seq_key UNIQUE (source_seq);


--
-- Name: skywatch_leave_requests skywatch_leave_requests_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.skywatch_leave_requests
    ADD CONSTRAINT skywatch_leave_requests_pkey PRIMARY KEY (id);


--
-- Name: skywatch_log_acknowledgments skywatch_log_acknowledgments_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.skywatch_log_acknowledgments
    ADD CONSTRAINT skywatch_log_acknowledgments_pkey PRIMARY KEY (log_id, user_id);


--
-- Name: skywatch_log_cards skywatch_log_cards_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.skywatch_log_cards
    ADD CONSTRAINT skywatch_log_cards_pkey PRIMARY KEY (id);


--
-- Name: skywatch_log_participants skywatch_log_participants_log_id_user_id_key; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.skywatch_log_participants
    ADD CONSTRAINT skywatch_log_participants_log_id_user_id_key UNIQUE (log_id, user_id);


--
-- Name: skywatch_log_participants skywatch_log_participants_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.skywatch_log_participants
    ADD CONSTRAINT skywatch_log_participants_pkey PRIMARY KEY (id);


--
-- Name: skywatch_log_reads skywatch_log_reads_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.skywatch_log_reads
    ADD CONSTRAINT skywatch_log_reads_pkey PRIMARY KEY (log_id, user_id);


--
-- Name: skywatch_log_vectors skywatch_log_vectors_log_id_chunk_no_key; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.skywatch_log_vectors
    ADD CONSTRAINT skywatch_log_vectors_log_id_chunk_no_key UNIQUE (log_id, chunk_no);


--
-- Name: skywatch_log_vectors skywatch_log_vectors_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.skywatch_log_vectors
    ADD CONSTRAINT skywatch_log_vectors_pkey PRIMARY KEY (id);


--
-- Name: skywatch_log_versions skywatch_log_versions_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.skywatch_log_versions
    ADD CONSTRAINT skywatch_log_versions_pkey PRIMARY KEY (id);


--
-- Name: skywatch_logs skywatch_logs_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.skywatch_logs
    ADD CONSTRAINT skywatch_logs_pkey PRIMARY KEY (id);


--
-- Name: skywatch_notifications skywatch_notifications_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.skywatch_notifications
    ADD CONSTRAINT skywatch_notifications_pkey PRIMARY KEY (id);


--
-- Name: skywatch_pr_batch_attachments skywatch_pr_batch_attachments_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.skywatch_pr_batch_attachments
    ADD CONSTRAINT skywatch_pr_batch_attachments_pkey PRIMARY KEY (id);


--
-- Name: skywatch_pr_batch_items skywatch_pr_batch_items_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.skywatch_pr_batch_items
    ADD CONSTRAINT skywatch_pr_batch_items_pkey PRIMARY KEY (id);


--
-- Name: skywatch_pr_batches skywatch_pr_batches_batch_no_key; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.skywatch_pr_batches
    ADD CONSTRAINT skywatch_pr_batches_batch_no_key UNIQUE (batch_no);


--
-- Name: skywatch_pr_batches skywatch_pr_batches_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.skywatch_pr_batches
    ADD CONSTRAINT skywatch_pr_batches_pkey PRIMARY KEY (id);


--
-- Name: skywatch_pr_verifications skywatch_pr_verifications_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.skywatch_pr_verifications
    ADD CONSTRAINT skywatch_pr_verifications_pkey PRIMARY KEY (id);


--
-- Name: skywatch_pr_workbook_imports skywatch_pr_workbook_imports_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.skywatch_pr_workbook_imports
    ADD CONSTRAINT skywatch_pr_workbook_imports_pkey PRIMARY KEY (id);


--
-- Name: skywatch_recurring_task_templates skywatch_recurring_task_templates_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.skywatch_recurring_task_templates
    ADD CONSTRAINT skywatch_recurring_task_templates_pkey PRIMARY KEY (id);


--
-- Name: skywatch_reindex_jobs skywatch_reindex_jobs_job_id_key; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.skywatch_reindex_jobs
    ADD CONSTRAINT skywatch_reindex_jobs_job_id_key UNIQUE (job_id);


--
-- Name: skywatch_reindex_jobs skywatch_reindex_jobs_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.skywatch_reindex_jobs
    ADD CONSTRAINT skywatch_reindex_jobs_pkey PRIMARY KEY (id);


--
-- Name: skywatch_schedules skywatch_schedules_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.skywatch_schedules
    ADD CONSTRAINT skywatch_schedules_pkey PRIMARY KEY (id);


--
-- Name: skywatch_schedules skywatch_schedules_team_date_key; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.skywatch_schedules
    ADD CONSTRAINT skywatch_schedules_team_date_key UNIQUE (team, date);


--
-- Name: skywatch_search_suggestions skywatch_search_suggestions_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.skywatch_search_suggestions
    ADD CONSTRAINT skywatch_search_suggestions_pkey PRIMARY KEY (id);


--
-- Name: skywatch_sessions skywatch_sessions_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.skywatch_sessions
    ADD CONSTRAINT skywatch_sessions_pkey PRIMARY KEY (id);


--
-- Name: skywatch_shift_carry_over skywatch_shift_carry_over_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.skywatch_shift_carry_over
    ADD CONSTRAINT skywatch_shift_carry_over_pkey PRIMARY KEY (id);


--
-- Name: skywatch_shift_carry_raw skywatch_shift_carry_raw_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.skywatch_shift_carry_raw
    ADD CONSTRAINT skywatch_shift_carry_raw_pkey PRIMARY KEY (id);


--
-- Name: skywatch_shift_notices skywatch_shift_notices_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.skywatch_shift_notices
    ADD CONSTRAINT skywatch_shift_notices_pkey PRIMARY KEY (id);


--
-- Name: skywatch_shift_overrides skywatch_shift_overrides_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.skywatch_shift_overrides
    ADD CONSTRAINT skywatch_shift_overrides_pkey PRIMARY KEY (id);


--
-- Name: skywatch_shift_staff_master skywatch_shift_staff_master_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.skywatch_shift_staff_master
    ADD CONSTRAINT skywatch_shift_staff_master_pkey PRIMARY KEY (id);


--
-- Name: skywatch_shift_staff_memos skywatch_shift_staff_memos_date_user_id_memo_type_key; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.skywatch_shift_staff_memos
    ADD CONSTRAINT skywatch_shift_staff_memos_date_user_id_memo_type_key UNIQUE (date, user_id, memo_type);


--
-- Name: skywatch_shift_staff_memos skywatch_shift_staff_memos_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.skywatch_shift_staff_memos
    ADD CONSTRAINT skywatch_shift_staff_memos_pkey PRIMARY KEY (id);


--
-- Name: skywatch_tasks skywatch_tasks_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.skywatch_tasks
    ADD CONSTRAINT skywatch_tasks_pkey PRIMARY KEY (id);


--
-- Name: skywatch_tech_doc_attachments skywatch_tech_doc_attachments_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.skywatch_tech_doc_attachments
    ADD CONSTRAINT skywatch_tech_doc_attachments_pkey PRIMARY KEY (id);


--
-- Name: skywatch_tech_doc_categories skywatch_tech_doc_categories_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.skywatch_tech_doc_categories
    ADD CONSTRAINT skywatch_tech_doc_categories_pkey PRIMARY KEY (id);


--
-- Name: skywatch_tech_doc_categories skywatch_tech_doc_categories_project_code_category_code_key; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.skywatch_tech_doc_categories
    ADD CONSTRAINT skywatch_tech_doc_categories_project_code_category_code_key UNIQUE (project_code, category_code);


--
-- Name: skywatch_tech_doc_vectors skywatch_tech_doc_vectors_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.skywatch_tech_doc_vectors
    ADD CONSTRAINT skywatch_tech_doc_vectors_pkey PRIMARY KEY (id);


--
-- Name: skywatch_tech_doc_vectors skywatch_tech_doc_vectors_tech_doc_id_chunk_index_key; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.skywatch_tech_doc_vectors
    ADD CONSTRAINT skywatch_tech_doc_vectors_tech_doc_id_chunk_index_key UNIQUE (tech_doc_id, chunk_index);


--
-- Name: skywatch_tech_docs skywatch_tech_docs_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.skywatch_tech_docs
    ADD CONSTRAINT skywatch_tech_docs_pkey PRIMARY KEY (id);


--
-- Name: skywatch_users skywatch_users_login_id_key; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.skywatch_users
    ADD CONSTRAINT skywatch_users_login_id_key UNIQUE (login_id);


--
-- Name: skywatch_users skywatch_users_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.skywatch_users
    ADD CONSTRAINT skywatch_users_pkey PRIMARY KEY (id);


--
-- Name: skywatch_work_thread_cards skywatch_work_thread_cards_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.skywatch_work_thread_cards
    ADD CONSTRAINT skywatch_work_thread_cards_pkey PRIMARY KEY (card_id);


--
-- Name: skywatch_work_thread_phases skywatch_work_thread_phases_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.skywatch_work_thread_phases
    ADD CONSTRAINT skywatch_work_thread_phases_pkey PRIMARY KEY (id);


--
-- Name: skywatch_work_threads skywatch_work_threads_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.skywatch_work_threads
    ADD CONSTRAINT skywatch_work_threads_pkey PRIMARY KEY (id);


--
-- Name: skywatch_card_vectors uq_card_vectors_card_id_chunk_no; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.skywatch_card_vectors
    ADD CONSTRAINT uq_card_vectors_card_id_chunk_no UNIQUE (card_id, chunk_no);


--
-- Name: skywatch_pr_verifications uq_pr_verification_round; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.skywatch_pr_verifications
    ADD CONSTRAINT uq_pr_verification_round UNIQUE (item_id, user_id, round_no);


--
-- Name: skywatch_pr_workbook_imports uq_pr_workbook_batch_user; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.skywatch_pr_workbook_imports
    ADD CONSTRAINT uq_pr_workbook_batch_user UNIQUE (batch_id, user_id);


--
-- Name: skywatch_search_suggestions uq_search_suggestions_query_text; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.skywatch_search_suggestions
    ADD CONSTRAINT uq_search_suggestions_query_text UNIQUE (query_text);


--
-- Name: skywatch_shift_carry_raw uq_shift_carry_raw_year_name; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.skywatch_shift_carry_raw
    ADD CONSTRAINT uq_shift_carry_raw_year_name UNIQUE (year, name);


--
-- Name: idx_card_links_source; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_card_links_source ON public.skywatch_card_links USING btree (source_card_id);


--
-- Name: idx_card_links_target; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_card_links_target ON public.skywatch_card_links USING btree (target_card_id);


--
-- Name: idx_card_vectors_card_id; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_card_vectors_card_id ON public.skywatch_card_vectors USING btree (card_id);


--
-- Name: idx_card_vectors_embedding_hnsw; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_card_vectors_embedding_hnsw ON public.skywatch_card_vectors USING hnsw (embedding_vector public.vector_cosine_ops);


--
-- Name: idx_card_vectors_model; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_card_vectors_model ON public.skywatch_card_vectors USING btree (model_name);


--
-- Name: idx_log_vectors_embedding_hnsw; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_log_vectors_embedding_hnsw ON public.skywatch_log_vectors USING hnsw (embedding_vector public.vector_cosine_ops);


--
-- Name: idx_log_vectors_log_id; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_log_vectors_log_id ON public.skywatch_log_vectors USING btree (log_id);


--
-- Name: idx_log_vectors_model; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_log_vectors_model ON public.skywatch_log_vectors USING btree (model_name);


--
-- Name: idx_sw_attachments_owner; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_sw_attachments_owner ON public.skywatch_attachments USING btree (owner_type, owner_id) WHERE (is_deleted = false);


--
-- Name: idx_sw_cards_log_id; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_sw_cards_log_id ON public.skywatch_log_cards USING btree (log_id);


--
-- Name: idx_sw_cards_status; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_sw_cards_status ON public.skywatch_log_cards USING btree (status) WHERE (is_deleted = false);


--
-- Name: idx_sw_carry_user; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_sw_carry_user ON public.skywatch_shift_carry_over USING btree (user_id, entry_date);


--
-- Name: idx_tech_doc_att_doc_id; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_tech_doc_att_doc_id ON public.skywatch_tech_doc_attachments USING btree (tech_doc_id);


--
-- Name: idx_tech_doc_vec_doc_id; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_tech_doc_vec_doc_id ON public.skywatch_tech_doc_vectors USING btree (tech_doc_id);


--
-- Name: idx_tech_docs_category_code; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_tech_docs_category_code ON public.skywatch_tech_docs USING btree (category_code);


--
-- Name: idx_tech_docs_is_deleted; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_tech_docs_is_deleted ON public.skywatch_tech_docs USING btree (is_deleted);


--
-- Name: idx_tech_docs_legacy_seq; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_tech_docs_legacy_seq ON public.skywatch_tech_docs USING btree (legacy_seq);


--
-- Name: idx_tech_docs_project_code; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_tech_docs_project_code ON public.skywatch_tech_docs USING btree (project_code);


--
-- Name: idx_tech_docs_record_date; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_tech_docs_record_date ON public.skywatch_tech_docs USING btree (record_date DESC);


--
-- Name: ix_comments_body_trgm; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX ix_comments_body_trgm ON public.skywatch_comments USING gin (body public.gin_trgm_ops);


--
-- Name: ix_inquiries_category; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX ix_inquiries_category ON public.skywatch_inquiries USING btree (category);


--
-- Name: ix_inquiries_content_trgm; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX ix_inquiries_content_trgm ON public.skywatch_inquiries USING gin (content public.gin_trgm_ops);


--
-- Name: ix_inquiries_keyword_trgm; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX ix_inquiries_keyword_trgm ON public.skywatch_inquiries USING gin (keyword public.gin_trgm_ops);


--
-- Name: ix_inquiries_occurred_date; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX ix_inquiries_occurred_date ON public.skywatch_inquiries USING btree (occurred_date);


--
-- Name: ix_inquiries_status; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX ix_inquiries_status ON public.skywatch_inquiries USING btree (status);


--
-- Name: ix_inquiry_vectors_inquiry_id; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX ix_inquiry_vectors_inquiry_id ON public.skywatch_inquiry_vectors USING btree (inquiry_id);


--
-- Name: ix_issue_vectors_issue_id; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX ix_issue_vectors_issue_id ON public.skywatch_issue_vectors USING btree (issue_id);


--
-- Name: ix_issues_content_trgm; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX ix_issues_content_trgm ON public.skywatch_issues USING gin (content public.gin_trgm_ops);


--
-- Name: ix_issues_title_trgm; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX ix_issues_title_trgm ON public.skywatch_issues USING gin (title public.gin_trgm_ops);


--
-- Name: ix_log_cards_content_trgm; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX ix_log_cards_content_trgm ON public.skywatch_log_cards USING gin (content public.gin_trgm_ops);


--
-- Name: ix_log_cards_title_trgm; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX ix_log_cards_title_trgm ON public.skywatch_log_cards USING gin (title public.gin_trgm_ops);


--
-- Name: ix_logs_title_trgm; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX ix_logs_title_trgm ON public.skywatch_logs USING gin (title public.gin_trgm_ops);


--
-- Name: ix_pr_batch_attachments_batch_id; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX ix_pr_batch_attachments_batch_id ON public.skywatch_pr_batch_attachments USING btree (batch_id);


--
-- Name: ix_pr_batch_items_batch_id; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX ix_pr_batch_items_batch_id ON public.skywatch_pr_batch_items USING btree (batch_id);


--
-- Name: ix_pr_batches_status; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX ix_pr_batches_status ON public.skywatch_pr_batches USING btree (status);


--
-- Name: ix_pr_verifications_item; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX ix_pr_verifications_item ON public.skywatch_pr_verifications USING btree (item_id);


--
-- Name: ix_pr_verifications_result; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX ix_pr_verifications_result ON public.skywatch_pr_verifications USING btree (result);


--
-- Name: ix_pr_verifications_user; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX ix_pr_verifications_user ON public.skywatch_pr_verifications USING btree (user_id);


--
-- Name: ix_pr_workbook_import_batch; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX ix_pr_workbook_import_batch ON public.skywatch_pr_workbook_imports USING btree (batch_id);


--
-- Name: ix_pr_workbook_import_user; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX ix_pr_workbook_import_user ON public.skywatch_pr_workbook_imports USING btree (user_id);


--
-- Name: ix_search_suggestions_query_text_pattern; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX ix_search_suggestions_query_text_pattern ON public.skywatch_search_suggestions USING btree (query_text varchar_pattern_ops);


--
-- Name: ix_skywatch_issue_comments_issue_id; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX ix_skywatch_issue_comments_issue_id ON public.skywatch_issue_comments USING btree (issue_id);


--
-- Name: ix_skywatch_issues_reg_date; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX ix_skywatch_issues_reg_date ON public.skywatch_issues USING btree (reg_date);


--
-- Name: ix_skywatch_issues_status; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX ix_skywatch_issues_status ON public.skywatch_issues USING btree (status);


--
-- Name: ix_skywatch_work_thread_cards_thread_id; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX ix_skywatch_work_thread_cards_thread_id ON public.skywatch_work_thread_cards USING btree (thread_id);


--
-- Name: ix_tech_docs_content_trgm; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX ix_tech_docs_content_trgm ON public.skywatch_tech_docs USING gin (content public.gin_trgm_ops);


--
-- Name: ix_tech_docs_title_trgm; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX ix_tech_docs_title_trgm ON public.skywatch_tech_docs USING gin (title public.gin_trgm_ops);


--
-- Name: ix_work_threads_status; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX ix_work_threads_status ON public.skywatch_work_threads USING btree (kind, status);


--
-- Name: skywatch_logs_date_shift_type_active_uidx; Type: INDEX; Schema: public; Owner: -
--

CREATE UNIQUE INDEX skywatch_logs_date_shift_type_active_uidx ON public.skywatch_logs USING btree (date, shift_type) WHERE ((is_deleted = false) AND ((shift_type)::text <> '공지'::text));


--
-- Name: skywatch_backup_logs fk_backup_logs_deleted_by; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.skywatch_backup_logs
    ADD CONSTRAINT fk_backup_logs_deleted_by FOREIGN KEY (deleted_by) REFERENCES public.skywatch_users(id);


--
-- Name: skywatch_backup_logs skywatch_backup_logs_performed_by_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.skywatch_backup_logs
    ADD CONSTRAINT skywatch_backup_logs_performed_by_fkey FOREIGN KEY (performed_by) REFERENCES public.skywatch_users(id);


--
-- Name: skywatch_card_memo_checks skywatch_card_memo_checks_card_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.skywatch_card_memo_checks
    ADD CONSTRAINT skywatch_card_memo_checks_card_id_fkey FOREIGN KEY (card_id) REFERENCES public.skywatch_log_cards(id) ON DELETE CASCADE;


--
-- Name: skywatch_card_memo_checks skywatch_card_memo_checks_user_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.skywatch_card_memo_checks
    ADD CONSTRAINT skywatch_card_memo_checks_user_id_fkey FOREIGN KEY (user_id) REFERENCES public.skywatch_users(id) ON DELETE CASCADE;


--
-- Name: skywatch_card_memos skywatch_card_memos_card_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.skywatch_card_memos
    ADD CONSTRAINT skywatch_card_memos_card_id_fkey FOREIGN KEY (card_id) REFERENCES public.skywatch_log_cards(id) ON DELETE CASCADE;


--
-- Name: skywatch_card_memos skywatch_card_memos_target_user_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.skywatch_card_memos
    ADD CONSTRAINT skywatch_card_memos_target_user_id_fkey FOREIGN KEY (target_user_id) REFERENCES public.skywatch_users(id);


--
-- Name: skywatch_card_vectors skywatch_card_vectors_card_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.skywatch_card_vectors
    ADD CONSTRAINT skywatch_card_vectors_card_id_fkey FOREIGN KEY (card_id) REFERENCES public.skywatch_log_cards(id) ON DELETE CASCADE;


--
-- Name: skywatch_commute_months skywatch_commute_months_uploaded_by_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.skywatch_commute_months
    ADD CONSTRAINT skywatch_commute_months_uploaded_by_fkey FOREIGN KEY (uploaded_by) REFERENCES public.skywatch_users(id) ON DELETE SET NULL;


--
-- Name: skywatch_inquiries skywatch_inquiries_card_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.skywatch_inquiries
    ADD CONSTRAINT skywatch_inquiries_card_id_fkey FOREIGN KEY (card_id) REFERENCES public.skywatch_log_cards(id);


--
-- Name: skywatch_inquiries skywatch_inquiries_created_by_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.skywatch_inquiries
    ADD CONSTRAINT skywatch_inquiries_created_by_fkey FOREIGN KEY (created_by) REFERENCES public.skywatch_users(id);


--
-- Name: skywatch_inquiries skywatch_inquiries_deleted_by_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.skywatch_inquiries
    ADD CONSTRAINT skywatch_inquiries_deleted_by_fkey FOREIGN KEY (deleted_by) REFERENCES public.skywatch_users(id);


--
-- Name: skywatch_inquiries skywatch_inquiries_last_edited_by_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.skywatch_inquiries
    ADD CONSTRAINT skywatch_inquiries_last_edited_by_fkey FOREIGN KEY (last_edited_by) REFERENCES public.skywatch_users(id);


--
-- Name: skywatch_inquiries skywatch_inquiries_received_by_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.skywatch_inquiries
    ADD CONSTRAINT skywatch_inquiries_received_by_fkey FOREIGN KEY (received_by) REFERENCES public.skywatch_users(id);


--
-- Name: skywatch_inquiry_vectors skywatch_inquiry_vectors_inquiry_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.skywatch_inquiry_vectors
    ADD CONSTRAINT skywatch_inquiry_vectors_inquiry_id_fkey FOREIGN KEY (inquiry_id) REFERENCES public.skywatch_inquiries(id) ON DELETE CASCADE;


--
-- Name: skywatch_issue_comments skywatch_issue_comments_created_by_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.skywatch_issue_comments
    ADD CONSTRAINT skywatch_issue_comments_created_by_fkey FOREIGN KEY (created_by) REFERENCES public.skywatch_users(id);


--
-- Name: skywatch_issue_comments skywatch_issue_comments_issue_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.skywatch_issue_comments
    ADD CONSTRAINT skywatch_issue_comments_issue_id_fkey FOREIGN KEY (issue_id) REFERENCES public.skywatch_issues(id) ON DELETE CASCADE;


--
-- Name: skywatch_issue_vectors skywatch_issue_vectors_issue_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.skywatch_issue_vectors
    ADD CONSTRAINT skywatch_issue_vectors_issue_id_fkey FOREIGN KEY (issue_id) REFERENCES public.skywatch_issues(id) ON DELETE CASCADE;


--
-- Name: skywatch_issues skywatch_issues_assigned_to_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.skywatch_issues
    ADD CONSTRAINT skywatch_issues_assigned_to_fkey FOREIGN KEY (assigned_to) REFERENCES public.skywatch_users(id);


--
-- Name: skywatch_issues skywatch_issues_created_by_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.skywatch_issues
    ADD CONSTRAINT skywatch_issues_created_by_fkey FOREIGN KEY (created_by) REFERENCES public.skywatch_users(id);


--
-- Name: skywatch_issues skywatch_issues_deleted_by_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.skywatch_issues
    ADD CONSTRAINT skywatch_issues_deleted_by_fkey FOREIGN KEY (deleted_by) REFERENCES public.skywatch_users(id);


--
-- Name: skywatch_issues skywatch_issues_last_edited_by_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.skywatch_issues
    ADD CONSTRAINT skywatch_issues_last_edited_by_fkey FOREIGN KEY (last_edited_by) REFERENCES public.skywatch_users(id);


--
-- Name: skywatch_pr_batch_attachments skywatch_pr_batch_attachments_batch_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.skywatch_pr_batch_attachments
    ADD CONSTRAINT skywatch_pr_batch_attachments_batch_id_fkey FOREIGN KEY (batch_id) REFERENCES public.skywatch_pr_batches(id) ON DELETE CASCADE;


--
-- Name: skywatch_pr_batch_attachments skywatch_pr_batch_attachments_uploaded_by_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.skywatch_pr_batch_attachments
    ADD CONSTRAINT skywatch_pr_batch_attachments_uploaded_by_fkey FOREIGN KEY (uploaded_by) REFERENCES public.skywatch_users(id);


--
-- Name: skywatch_pr_batch_items skywatch_pr_batch_items_batch_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.skywatch_pr_batch_items
    ADD CONSTRAINT skywatch_pr_batch_items_batch_id_fkey FOREIGN KEY (batch_id) REFERENCES public.skywatch_pr_batches(id) ON DELETE CASCADE;


--
-- Name: skywatch_pr_batch_items skywatch_pr_batch_items_issue_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.skywatch_pr_batch_items
    ADD CONSTRAINT skywatch_pr_batch_items_issue_id_fkey FOREIGN KEY (issue_id) REFERENCES public.skywatch_issues(id);


--
-- Name: skywatch_pr_batches skywatch_pr_batches_created_by_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.skywatch_pr_batches
    ADD CONSTRAINT skywatch_pr_batches_created_by_fkey FOREIGN KEY (created_by) REFERENCES public.skywatch_users(id);


--
-- Name: skywatch_pr_batches skywatch_pr_batches_deleted_by_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.skywatch_pr_batches
    ADD CONSTRAINT skywatch_pr_batches_deleted_by_fkey FOREIGN KEY (deleted_by) REFERENCES public.skywatch_users(id);


--
-- Name: skywatch_pr_verifications skywatch_pr_verifications_approved_by_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.skywatch_pr_verifications
    ADD CONSTRAINT skywatch_pr_verifications_approved_by_fkey FOREIGN KEY (approved_by) REFERENCES public.skywatch_users(id);


--
-- Name: skywatch_pr_verifications skywatch_pr_verifications_created_by_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.skywatch_pr_verifications
    ADD CONSTRAINT skywatch_pr_verifications_created_by_fkey FOREIGN KEY (created_by) REFERENCES public.skywatch_users(id);


--
-- Name: skywatch_pr_verifications skywatch_pr_verifications_item_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.skywatch_pr_verifications
    ADD CONSTRAINT skywatch_pr_verifications_item_id_fkey FOREIGN KEY (item_id) REFERENCES public.skywatch_pr_batch_items(id) ON DELETE CASCADE;


--
-- Name: skywatch_pr_verifications skywatch_pr_verifications_source_import_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.skywatch_pr_verifications
    ADD CONSTRAINT skywatch_pr_verifications_source_import_id_fkey FOREIGN KEY (source_import_id) REFERENCES public.skywatch_pr_workbook_imports(id) ON DELETE SET NULL;


--
-- Name: skywatch_pr_verifications skywatch_pr_verifications_submitted_by_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.skywatch_pr_verifications
    ADD CONSTRAINT skywatch_pr_verifications_submitted_by_fkey FOREIGN KEY (submitted_by) REFERENCES public.skywatch_users(id);


--
-- Name: skywatch_pr_verifications skywatch_pr_verifications_user_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.skywatch_pr_verifications
    ADD CONSTRAINT skywatch_pr_verifications_user_id_fkey FOREIGN KEY (user_id) REFERENCES public.skywatch_users(id);


--
-- Name: skywatch_pr_workbook_imports skywatch_pr_workbook_imports_batch_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.skywatch_pr_workbook_imports
    ADD CONSTRAINT skywatch_pr_workbook_imports_batch_id_fkey FOREIGN KEY (batch_id) REFERENCES public.skywatch_pr_batches(id) ON DELETE CASCADE;


--
-- Name: skywatch_pr_workbook_imports skywatch_pr_workbook_imports_user_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.skywatch_pr_workbook_imports
    ADD CONSTRAINT skywatch_pr_workbook_imports_user_id_fkey FOREIGN KEY (user_id) REFERENCES public.skywatch_users(id);


--
-- Name: skywatch_tech_doc_attachments skywatch_tech_doc_attachments_tech_doc_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.skywatch_tech_doc_attachments
    ADD CONSTRAINT skywatch_tech_doc_attachments_tech_doc_id_fkey FOREIGN KEY (tech_doc_id) REFERENCES public.skywatch_tech_docs(id);


--
-- Name: skywatch_tech_doc_attachments skywatch_tech_doc_attachments_uploaded_by_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.skywatch_tech_doc_attachments
    ADD CONSTRAINT skywatch_tech_doc_attachments_uploaded_by_fkey FOREIGN KEY (uploaded_by) REFERENCES public.skywatch_users(id);


--
-- Name: skywatch_tech_doc_vectors skywatch_tech_doc_vectors_tech_doc_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.skywatch_tech_doc_vectors
    ADD CONSTRAINT skywatch_tech_doc_vectors_tech_doc_id_fkey FOREIGN KEY (tech_doc_id) REFERENCES public.skywatch_tech_docs(id) ON DELETE CASCADE;


--
-- Name: skywatch_tech_docs skywatch_tech_docs_author_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.skywatch_tech_docs
    ADD CONSTRAINT skywatch_tech_docs_author_id_fkey FOREIGN KEY (author_id) REFERENCES public.skywatch_users(id);


--
-- Name: skywatch_tech_docs skywatch_tech_docs_created_by_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.skywatch_tech_docs
    ADD CONSTRAINT skywatch_tech_docs_created_by_fkey FOREIGN KEY (created_by) REFERENCES public.skywatch_users(id);


--
-- Name: skywatch_tech_docs skywatch_tech_docs_last_edited_by_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.skywatch_tech_docs
    ADD CONSTRAINT skywatch_tech_docs_last_edited_by_fkey FOREIGN KEY (last_edited_by) REFERENCES public.skywatch_users(id);


--
-- Name: skywatch_work_thread_cards skywatch_work_thread_cards_card_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.skywatch_work_thread_cards
    ADD CONSTRAINT skywatch_work_thread_cards_card_id_fkey FOREIGN KEY (card_id) REFERENCES public.skywatch_log_cards(id) ON DELETE CASCADE;


--
-- Name: skywatch_work_thread_cards skywatch_work_thread_cards_linked_by_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.skywatch_work_thread_cards
    ADD CONSTRAINT skywatch_work_thread_cards_linked_by_fkey FOREIGN KEY (linked_by) REFERENCES public.skywatch_users(id);


--
-- Name: skywatch_work_thread_cards skywatch_work_thread_cards_thread_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.skywatch_work_thread_cards
    ADD CONSTRAINT skywatch_work_thread_cards_thread_id_fkey FOREIGN KEY (thread_id) REFERENCES public.skywatch_work_threads(id) ON DELETE CASCADE;


--
-- Name: skywatch_work_thread_phases skywatch_work_thread_phases_thread_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.skywatch_work_thread_phases
    ADD CONSTRAINT skywatch_work_thread_phases_thread_id_fkey FOREIGN KEY (thread_id) REFERENCES public.skywatch_work_threads(id) ON DELETE CASCADE;


--
-- Name: skywatch_work_threads skywatch_work_threads_category_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.skywatch_work_threads
    ADD CONSTRAINT skywatch_work_threads_category_id_fkey FOREIGN KEY (category_id) REFERENCES public.skywatch_card_categories(id);


--
-- Name: skywatch_work_threads skywatch_work_threads_created_by_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.skywatch_work_threads
    ADD CONSTRAINT skywatch_work_threads_created_by_fkey FOREIGN KEY (created_by) REFERENCES public.skywatch_users(id);


--
-- Name: skywatch_work_threads skywatch_work_threads_owner_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.skywatch_work_threads
    ADD CONSTRAINT skywatch_work_threads_owner_id_fkey FOREIGN KEY (owner_id) REFERENCES public.skywatch_users(id);


--
-- Name: skywatch_work_threads skywatch_work_threads_source_thread_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.skywatch_work_threads
    ADD CONSTRAINT skywatch_work_threads_source_thread_id_fkey FOREIGN KEY (source_thread_id) REFERENCES public.skywatch_work_threads(id);


--
-- PostgreSQL database dump complete
--

\unrestrict 60ol9sUHCZ887wSgpEcpSAYtbe9hEjWhegNhKgfFav9F00v1iZzidu2gTYbdLc9


-- Alembic head
INSERT INTO public.alembic_version (version_num) VALUES ('g2h3i4j5k6l7');
