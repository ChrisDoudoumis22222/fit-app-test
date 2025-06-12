'use client';

import { useState, useRef, useEffect } from 'react';
import { Link, useNavigate, useLocation } from 'react-router-dom';
import { supabase } from '../supabaseClient';
import { useAuth } from '../AuthProvider';

import {
  BarChart3, Briefcase, FileText, Globe, ShoppingBag,
  ChevronDown, User, Menu, X, Settings, LogOut,
} from 'lucide-react';

const NAV_HEIGHT = 80;                 //  h-20  (spacer height)

export default function TrainerMenu() {
  const { profile, profileLoaded } = useAuth();
  const navigate        = useNavigate();
  const location        = useLocation();

  const [mobileOpen, setMobileOpen] = useState(false);
  const [userOpen,   setUserOpen  ] = useState(false);
  const [scrolled,   setScrolled  ] = useState(false);

  const userMenuRef = useRef(null);

  /* ─── effects ─── */
  useEffect(()=>{ const h=()=>setScrolled(window.scrollY>20); window.addEventListener('scroll',h); return()=>window.removeEventListener('scroll',h);},[]);
  useEffect(()=>{ document.body.style.overflow = mobileOpen?'hidden':''; return()=>{document.body.style.overflow='';};},[mobileOpen]);
  useEffect(()=>{ const c=e=>{ if(userMenuRef.current&&!userMenuRef.current.contains(e.target)) setUserOpen(false);}; window.addEventListener('mousedown',c); return()=>window.removeEventListener('mousedown',c);},[]);

  if (!profileLoaded || !profile || profile.role!=='trainer') return null;

  const navItems = [
    {name:'Dashboard',          href:'/trainer',          icon:BarChart3},
    {name:'Υπηρεσίες',          href:'/trainer/services', icon:Briefcase},
    {name:'Αναρτήσεις',         href:'/trainer/posts',    icon:FileText},
    {name:'Όλες οι Αναρτήσεις', href:'/posts',            icon:Globe},
    {name:'Marketplace',        href:'/services',         icon:ShoppingBag},
  ];

  const logout = async()=>{ await supabase.auth.signOut(); navigate('/'); };

  /* ─── UI ─── */
  return (
    <>
      <nav
        style={{height:NAV_HEIGHT}}
        className={`fixed inset-x-0 top-0 z-50 flex items-center transition-all duration-300
          ${scrolled?'bg-black/95 backdrop-blur-xl border-b border-gray-800 shadow-2xl'
                    :'bg-black/90 backdrop-blur-md border-b border-gray-900'}`}
      >
        <div className="mx-auto flex w-full max-w-7xl items-center
                        justify-between px-6 lg:px-8 gap-8">  {/* extra GAP here */}
          {/* ───────── LEFT: burger + logo ───────── */}
          <div className="flex items-center gap-6">
            {/* burger (mobile only) */}
            <button onClick={()=>setMobileOpen(!mobileOpen)}
              className="md:hidden flex h-12 w-12 items-center justify-center rounded-xl
                         border border-gray-700 bg-gray-900 text-white
                         hover:bg-gray-800 hover:border-gray-600">
              <Menu className="h-5 w-5"/>
            </button>

            {/* logo + title */}
            <Link to="/trainer" className="group flex items-center gap-4">
              <div className="flex h-12 w-12 items-center justify-center rounded-xl
                              bg-white text-black shadow-lg group-hover:shadow-xl">
                <ShoppingBag className="h-6 w-6"/>
              </div>
              <span className="hidden sm:block text-2xl font-bold tracking-tight text-white">
                Trainer<span className="font-light text-gray-400">Hub</span>
              </span>
            </Link>
          </div>

          {/* ───────── CENTER: desktop nav pills/icons ───────── */}
          <div className="hidden md:flex items-center gap-6">
            {navItems.map(({name,href,icon:Icon})=>{
              const active = location.pathname===href;
              return active ? (
                <Link key={href} to={href}
                  className="flex items-center gap-3 rounded-xl bg-white px-6 py-3 text-sm font-medium
                             text-black shadow-lg">
                  <Icon className="h-4 w-4"/>
                  {name}
                </Link>
              ) : (
                <Link key={href} to={href}
                  className="flex h-12 w-12 items-center justify-center rounded-xl
                             text-gray-300 hover:text-white hover:bg-gray-800 transition">
                  <Icon className="h-5 w-5"/>
                  <span className="sr-only">{name}</span>
                </Link>
              );
            })}
          </div>

          {/* ───────── RIGHT: user dropdown ───────── */}
          <div className="flex items-center gap-8"> {/* bigger gap */}
            <div ref={userMenuRef} className="relative">
              <button onClick={()=>setUserOpen(!userOpen)}
                className="flex items-center gap-4 rounded-xl border border-gray-700
                           bg-gray-900 px-4 py-3 text-white hover:bg-gray-800 hover:border-gray-600">
                <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-white"> {/* bigger avatar */}
                  {profile.avatar_url
                    ? <img src={profile.avatar_url} alt="avatar"
                           className="h-10 w-10 rounded-lg object-cover"/>
                    : <User className="h-5 w-5 text-black"/>}
                </div>
                <span className="hidden max-w-36 truncate text-sm font-medium sm:block">
                  {profile.full_name || profile.email}
                </span>
                <ChevronDown className={`h-4 w-4 text-gray-400 transition-transform
                                         ${userOpen?'rotate-180':''}`}/>
              </button>

              {userOpen && (
                <div className="absolute right-0 mt-4 w-80 overflow-hidden rounded-2xl
                                border border-gray-800 bg-black shadow-2xl z-50">
                  {/* header */}
                  <div className="border-b border-gray-800 p-6">
                    <div className="flex items-center gap-6"> {/* << bigger gap */}
                      <div className="flex h-16 w-16 items-center justify-center rounded-xl bg-white">
                        {profile.avatar_url
                          ? <img src={profile.avatar_url} alt="avatar"
                                 className="h-16 w-16 rounded-xl object-cover"/>
                          : <User className="h-7 w-7 text-black"/>}
                      </div>
                      <div className="flex-1">
                        <p className="text-lg font-semibold text-white">
                          {profile.full_name || 'Trainer'}
                        </p>
                        <p className="mt-1 truncate text-sm text-gray-400">
                          {profile.email}
                        </p>
                      </div>
                    </div>
                  </div>

                  {/* menu */}
                  <div className="p-4 space-y-2">
                    <Link to="/trainer/profile" onClick={()=>setUserOpen(false)}
                      className="flex items-center gap-4 rounded-xl px-4 py-3 text-gray-300
                                 hover:bg-gray-900 hover:text-white">
                      <Settings className="h-5 w-5"/>
                      Ρυθμίσεις Προφίλ
                    </Link>
                    <button onClick={()=>{logout();setUserOpen(false);}}
                      className="flex w-full items-center gap-4 rounded-xl px-4 py-3 text-red-400
                                 hover:bg-red-950/30 hover:text-red-300">
                      <LogOut className="h-5 w-5"/>
                      Αποσύνδεση
                    </button>
                  </div>
                </div>
              )}
            </div>
          </div>
        </div>
      </nav>

      {/* spacer */}
      <div style={{height:NAV_HEIGHT}} />

      {/* MOBILE DRAWER (ίδιο με πριν – δεν αλλάζει) */}
      {mobileOpen && (
        <>
          <div className="fixed inset-0 z-40 bg-black/70 backdrop-blur-sm md:hidden"
               onClick={()=>setMobileOpen(false)} />
          <div className="fixed inset-y-0 left-0 z-50 w-full max-w-sm overflow-y-auto
                          border-r border-gray-800 bg-black md:hidden">
            {/* header */}
            <div className="flex items-center justify-between border-b border-gray-800 p-6">
              <div className="flex items-center gap-4">
                <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-white">
                  <ShoppingBag className="h-5 w-5 text-black"/>
                </div>
                <span className="text-xl font-bold text-white">Trainer Hub</span>
              </div>
              <button onClick={()=>setMobileOpen(false)}
                className="flex h-10 w-10 items-center justify-center rounded-xl border border-gray-700
                           bg-gray-900 text-gray-400 hover:bg-gray-800 hover:text-white">
                <X className="h-5 w-5"/>
              </button>
            </div>

            {/* nav */}
            <nav className="space-y-3 p-6">
              {navItems.map(({name,href,icon:Icon})=>{
                const active = location.pathname===href;
                return (
                  <Link key={href} to={href} onClick={()=>setMobileOpen(false)}
                    className={`flex items-center gap-4 rounded-xl px-5 py-4 text-base font-medium transition
                               ${active?'bg-white text-black':'text-gray-300 hover:bg-gray-900 hover:text-white'}`}>
                    <Icon className="h-5 w-5"/>
                    {name}
                  </Link>
                );
              })}
            </nav>

            {/* user footer */}
            <div className="mt-auto border-t border-gray-800 p-6 space-y-4">
              <div className="flex items-center gap-4 rounded-xl border border-gray-800 bg-gray-900 p-4">
                <div className="flex h-12 w-12 items-center justify-center rounded-xl bg-white">
                  {profile.avatar_url
                    ? <img src={profile.avatar_url} alt="avatar"
                           className="h-12 w-12 rounded-xl object-cover"/>
                    : <User className="h-6 w-6 text-black"/>}
                </div>
                <div className="flex-1">
                  <p className="text-base font-semibold text-white">
                    {profile.full_name || 'Trainer'}
                  </p>
                  <p className="truncate text-sm text-gray-400">
                    {profile.email}
                  </p>
                </div>
              </div>

              <Link to="/trainer/profile" onClick={()=>setMobileOpen(false)}
                    className="flex items-center gap-3 rounded-xl px-4 py-3 text-gray-300
                               hover:bg-gray-900 hover:text-white">
                <Settings className="h-5 w-5"/>
                Ρυθμίσεις Προφίλ
              </Link>
              <button onClick={()=>{logout();setMobileOpen(false);}}
                      className="flex w-full items-center gap-3 rounded-xl px-4 py-3 text-red-400
                                 hover:bg-red-950/30 hover:text-red-300">
                <LogOut className="h-5 w-5"/>
                Αποσύνδεση
              </button>
            </div>
          </div>
        </>
      )}
    </>
  );
}
