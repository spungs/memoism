-- Enable UUID extension
create extension if not exists "uuid-ossp";

-- Create profiles table
create table public.profiles (
    id uuid references auth.users on delete cascade primary key,
    username text unique,
    created_at timestamp with time zone default timezone('utc'::text, now()) not null,
    updated_at timestamp with time zone default timezone('utc'::text, now()) not null,
    character_age integer default 1 not null,
    coins integer default 0 not null,
    subscription_end_date timestamp with time zone
);

-- Create diaries table
create table public.diaries (
    id uuid default uuid_generate_v4() primary key,
    user_id uuid references public.profiles(id) on delete cascade not null,
    content text not null,
    image_url text,
    created_at timestamp with time zone default timezone('utc'::text, now()) not null,
    updated_at timestamp with time zone default timezone('utc'::text, now()) not null,
    is_public boolean default false not null
);

-- Create diary_comments table
create table public.diary_comments (
    id uuid default uuid_generate_v4() primary key,
    diary_id uuid references public.diaries(id) on delete cascade not null,
    user_id uuid references public.profiles(id) on delete cascade not null,
    content text not null,
    created_at timestamp with time zone default timezone('utc'::text, now()) not null
);

-- Create diary_reactions table
create table public.diary_reactions (
    id uuid default uuid_generate_v4() primary key,
    diary_id uuid references public.diaries(id) on delete cascade not null,
    user_id uuid references public.profiles(id) on delete cascade not null,
    reaction_type text not null check (reaction_type in ('❤️', '👍', '😢')),
    created_at timestamp with time zone default timezone('utc'::text, now()) not null,
    unique(diary_id, user_id, reaction_type)
);

-- Create store_items table
create table public.store_items (
    id uuid default uuid_generate_v4() primary key,
    name text not null,
    description text,
    price_coins integer not null,
    item_type text not null check (item_type in ('outfit', 'age_revert')),
    image_url text,
    created_at timestamp with time zone default timezone('utc'::text, now()) not null
);

-- Create user_items table
create table public.user_items (
    id uuid default uuid_generate_v4() primary key,
    user_id uuid references public.profiles(id) on delete cascade not null,
    item_id uuid references public.store_items(id) on delete cascade not null,
    purchased_at timestamp with time zone default timezone('utc'::text, now()) not null,
    is_equipped boolean default false not null,
    unique(user_id, item_id)
);

-- Create RLS policies
alter table public.profiles enable row level security;
alter table public.diaries enable row level security;
alter table public.diary_comments enable row level security;
alter table public.diary_reactions enable row level security;
alter table public.store_items enable row level security;
alter table public.user_items enable row level security;

-- Profiles policies
create policy "Users can view their own profile"
    on public.profiles for select
    using (auth.uid() = id);

create policy "Users can update their own profile"
    on public.profiles for update
    using (auth.uid() = id);

-- Diaries policies
create policy "Users can view their own diaries"
    on public.diaries for select
    using (auth.uid() = user_id);

create policy "Users can view public diaries"
    on public.diaries for select
    using (is_public = true);

create policy "Users can create their own diaries"
    on public.diaries for insert
    with check (auth.uid() = user_id);

create policy "Users can update their own diaries"
    on public.diaries for update
    using (auth.uid() = user_id);

create policy "Users can delete their own diaries"
    on public.diaries for delete
    using (auth.uid() = user_id);

-- Comments policies
-- create policy "Anyone can view comments on public diaries"
--     on public.diary_comments for select
--     using (
--         exists (
--             select 1 from public.diaries
--             where diaries.id = diary_comments.diary_id
--             and (diaries.is_public = true or diaries.user_id = auth.uid())
--         )
--     );
-- 
-- create policy "Users can create comments on public diaries"
--     on public.diary_comments for insert
--     with check (
--         exists (
--             select 1 from public.diaries
--             where diaries.id = diary_comments.diary_id
--             and diaries.is_public = true
--         )
--     );

-- Reactions policies
create policy "Anyone can view reactions on public diaries"
    on public.diary_reactions for select
    using (
        exists (
            select 1 from public.diaries
            where diaries.id = diary_reactions.diary_id
            and (diaries.is_public = true or diaries.user_id = auth.uid())
        )
    );

create policy "Users can create reactions on public diaries"
    on public.diary_reactions for insert
    with check (
        exists (
            select 1 from public.diaries
            where diaries.id = diary_reactions.diary_id
            and diaries.is_public = true
        )
    );

-- Store items policies
create policy "Anyone can view store items"
    on public.store_items for select
    to authenticated
    using (true);

-- User items policies
create policy "Users can view their own items"
    on public.user_items for select
    using (auth.uid() = user_id);

create policy "Users can update their own items"
    on public.user_items for update
    using (auth.uid() = user_id);

-- Create function to handle new user signup
create or replace function public.handle_new_user()
returns trigger as $$
begin
    insert into public.profiles (id, username)
    values (new.id, new.raw_user_meta_data->>'username');
    return new;
end;
$$ language plpgsql security definer;

-- Create trigger for new user signup
create trigger on_auth_user_created
    after insert on auth.users
    for each row execute procedure public.handle_new_user(); 