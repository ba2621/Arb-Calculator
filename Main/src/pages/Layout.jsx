

import React from 'react';
import { Link } from 'react-router-dom';
import { createPageUrl } from './utils';
import { Menu, ChevronDown } from 'lucide-react';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { Button } from "@/components/ui/button";

export default function Layout({ children, currentPageName }) {
  return (
    <>
      <style>
        {`
          @import url('https://fonts.googleapis.com/css2?family=EB+Garamond:ital,wght@0,400;0,500;0,700;1,400&display=swap');
          .font-latex {
            font-family: 'EB Garamond', serif;
          }
        `}
      </style>
      <div className="font-latex bg-[#0b0b60] text-gray-900 p-4 min-h-screen flex items-center justify-center">
        <div className="bg-white shadow-lg w-full max-w-7xl h-auto p-4 md:p-6 pb-12 border border-gray-300 relative">
            <div className="absolute top-4 left-4 z-10">
                <DropdownMenu>
                <DropdownMenuTrigger asChild>
                    <Button variant="outline" className="bg-white/90 backdrop-blur-sm hover:bg-white rounded-none font-latex">
                    <Menu className="w-4 h-4 mr-2" />
                    Menu
                    <ChevronDown className="w-4 h-4 ml-2" />
                    </Button>
                </DropdownMenuTrigger>
                <DropdownMenuContent align="start" className="w-48 rounded-none font-latex">
                    <DropdownMenuItem asChild>
                    <Link 
                        to={createPageUrl('OddsConverter')} 
                        className="w-full cursor-pointer"
                    >
                        Odds Converter
                    </Link>
                    </DropdownMenuItem>
                    <DropdownMenuItem asChild>
                    <Link 
                        to={createPageUrl('ArbFinder')} 
                        className="w-full cursor-pointer"
                    >
                        Arb Finder
                    </Link>
                    </DropdownMenuItem>
                </DropdownMenuContent>
                </DropdownMenu>
            </div>
            {children}
            <div className="absolute bottom-4 left-6 text-sm text-gray-500">
              Built by <a href="https://x.com/teambayes" target="_blank" rel="noopener noreferrer" className="underline hover:text-gray-800">Bayes</a>
            </div>
        </div>
      </div>
    </>
  );
}

