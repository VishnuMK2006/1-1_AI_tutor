import { useState, useRef } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { Menu, X, BrainCircuit, ChevronDown, LogOut, User } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { useAuth } from '@/contexts/AuthContext';
import { useClickOutside } from '@/hooks/useClickOutside';

const Header = () => {
  const [isMenuOpen, setIsMenuOpen] = useState(false);
  const [isDropdownOpen, setIsDropdownOpen] = useState(false);
  const dropdownRef = useRef<HTMLDivElement>(null);
  const { user, signOut } = useAuth();
  const navigate = useNavigate();

  useClickOutside(dropdownRef, () => setIsDropdownOpen(false));

  const handleSignOut = async () => {
    await signOut();
    navigate('/login');
    setIsDropdownOpen(false);
  };

  // Get display name or email
  const displayName = user?.user_metadata?.full_name || user?.email?.split('@')[0] || 'User';

  return (
    <header className="w-full fixed top-0 z-50 glass-dark py-4 px-6">
      <div className="container mx-auto flex justify-between items-center">
        <Link to="/" className="flex items-center space-x-2">
          <BrainCircuit className="h-8 w-8 text-thinkforge-purple" />
          <span className="text-xl font-bold bg-clip-text text-transparent bg-gradient-to-r from-thinkforge-purple to-thinkforge-violet">
            ThinkForge
          </span>
        </Link>

        {/* Desktop Navigation */}
        <nav className="hidden md:flex items-center space-x-8">
          <Link to="/" className="text-sm text-foreground/80 hover:text-thinkforge-purple transition-colors">
            Home
          </Link>
          <Link to="/chat" className="text-sm text-foreground/80 hover:text-thinkforge-purple transition-colors">
            AI Chat
          </Link>
          <Link to="/mcq-quiz" className="text-sm text-foreground/80 hover:text-thinkforge-purple transition-colors">
            Quiz
          </Link>
          <Link to="/progress" className="text-sm text-foreground/80 hover:text-thinkforge-purple transition-colors">
            Progress
          </Link>
          <Link to="/topics-to-review" className="text-sm text-foreground/80 hover:text-thinkforge-purple transition-colors">
            Topics to Review
          </Link>
          <div className="flex space-x-2">
            {user ? (
              <div className="relative" ref={dropdownRef}>
                <Button
                  variant="outline"
                  className="text-sm border-thinkforge-purple/50 hover:border-thinkforge-purple hover:bg-thinkforge-purple/10 flex items-center space-x-2"
                  onClick={() => setIsDropdownOpen(!isDropdownOpen)}
                >
                  <User className="h-4 w-4" />
                  <span>{displayName}</span>
                  <ChevronDown className={`h-4 w-4 ml-1 transition-transform duration-200 ${isDropdownOpen ? 'rotate-180' : ''}`} />
                </Button>
                {isDropdownOpen && (
                  <div className="absolute right-0 mt-2 w-48 glass-card rounded-md shadow-lg py-1 z-50 animate-fade-in">
                    <button
                      onClick={handleSignOut}
                      className="flex items-center w-full px-4 py-2 text-sm text-foreground/80 hover:bg-thinkforge-purple/10 transition-colors"
                    >
                      <LogOut className="h-4 w-4 mr-2" />
                      Sign Out
                    </button>
                  </div>
                )}
              </div>
            ) : (
              <>
                <Link to="/login">
                  <Button variant="outline" className="text-sm border-thinkforge-purple/50 hover:border-thinkforge-purple hover:bg-thinkforge-purple/10">
                    Login
                  </Button>
                </Link>
                <Link to="/signup">
                  <Button className="text-sm bg-thinkforge-purple hover:bg-thinkforge-purple/90">
                    Sign Up
                  </Button>
                </Link>
              </>
            )}
          </div>
        </nav>

        {/* Mobile Navigation Toggle */}
        <button
          className="md:hidden text-foreground/80 hover:text-thinkforge-purple transition-colors"
          onClick={() => setIsMenuOpen(!isMenuOpen)}
        >
          {isMenuOpen ? <X className="h-6 w-6" /> : <Menu className="h-6 w-6" />}
        </button>
      </div>

      {/* Mobile Navigation */}
      {isMenuOpen && (
        <div className="md:hidden glass-dark absolute top-full left-0 right-0 p-4 animate-fade-in">
          <nav className="flex flex-col space-y-4">
            <Link 
              to="/" 
              className="text-sm py-2 px-4 hover:bg-thinkforge-purple/10 rounded-md transition-colors"
              onClick={() => setIsMenuOpen(false)}
            >
              Home
            </Link>
            <Link 
              to="/chat" 
              className="text-sm py-2 px-4 hover:bg-thinkforge-purple/10 rounded-md transition-colors"
              onClick={() => setIsMenuOpen(false)}
            >
              AI Chat
            </Link>
            <Link 
              to="/mcq-quiz" 
              className="text-sm py-2 px-4 hover:bg-thinkforge-purple/10 rounded-md transition-colors"
              onClick={() => setIsMenuOpen(false)}
            >
              Quiz
            </Link>
            <Link 
              to="/progress" 
              className="text-sm py-2 px-4 hover:bg-thinkforge-purple/10 rounded-md transition-colors"
              onClick={() => setIsMenuOpen(false)}
            >
              Progress
            </Link>
            <Link 
              to="/topics-to-review" 
              className="text-sm py-2 px-4 hover:bg-thinkforge-purple/10 rounded-md transition-colors"
              onClick={() => setIsMenuOpen(false)}
            >
              Topics to Review
            </Link>
            <div className="flex flex-col space-y-2 pt-2">
              {user ? (
                <Button 
                  variant="outline" 
                  className="w-full text-sm border-thinkforge-purple/50 hover:border-thinkforge-purple hover:bg-thinkforge-purple/10 justify-start"
                  onClick={handleSignOut}
                >
                  <LogOut className="h-4 w-4 mr-2" />
                  Sign Out ({displayName})
                </Button>
              ) : (
                <>
                  <Link to="/login" onClick={() => setIsMenuOpen(false)}>
                    <Button variant="outline" className="w-full text-sm border-thinkforge-purple/50 hover:border-thinkforge-purple hover:bg-thinkforge-purple/10">
                      Login
                    </Button>
                  </Link>
                  <Link to="/signup" onClick={() => setIsMenuOpen(false)}>
                    <Button className="w-full text-sm bg-thinkforge-purple hover:bg-thinkforge-purple/90">
                      Sign Up
                    </Button>
                  </Link>
                </>
              )}
            </div>
          </nav>
        </div>
      )}
    </header>
  );
};

export default Header;
