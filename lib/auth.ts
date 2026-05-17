import NextAuth from "next-auth"
import Google from "next-auth/providers/google"
import { createSupabaseServerClient } from "./supabase"

export const { handlers, auth, signIn, signOut } = NextAuth({
  secret: process.env.AUTH_SECRET,
  trustHost: true,
  providers: [
    Google({
      clientId: process.env.AUTH_GOOGLE_ID,
      clientSecret: process.env.AUTH_GOOGLE_SECRET,
    }),
  ],
  callbacks: {
    async signIn({ user, account, profile }) {
      console.log("--- SignIn Callback Start ---");
      if (!user.email) return false;

      // 1. Sync user to Supabase
      const supabase = createSupabaseServerClient();
      
      // Check if user already exists by email
      const { data: existingUser } = await supabase
        .from('users')
        .select('*')
        .eq('email', user.email)
        .single();

      let userData = existingUser;

      if (!existingUser) {
        // New user - auto-register as employee (as per requirement 5)
        const { data: newUser, error: createError } = await supabase
          .from('users')
          .insert({
            email: user.email,
            full_name: user.name,
            google_id: user.id,
            role: 'employee',
            avatar_url: user.image,
            is_active: false // New users need approval
          })
          .select()
          .single();
        
        if (createError) {
          console.error('Supabase Sync Error:', createError);
          return false;
        }
        userData = newUser;
      } else if (!existingUser.google_id) {
        // Invited user - link google_id to the invited email
        const { data: linkedUser, error: linkError } = await supabase
          .from('users')
          .update({ 
            google_id: user.id,
            avatar_url: user.image,
            // Update name only if it was empty
            full_name: existingUser.full_name || user.name 
          })
          .eq('email', user.email)
          .select()
          .single();
          
        if (linkError) {
          console.error('Supabase Link Error:', linkError);
          return false;
        }
        userData = linkedUser;
      }

      console.log('Supabase Sync Success:', userData.id);
      
      // Attach metadata to user object for subsequent callbacks
      (user as any).db_id = userData.id;
      (user as any).role = userData.role;
      (user as any).is_active = userData.is_active;
      
      return true;
    },
    async jwt({ token, user }) {
      if (user) {
        token.role = (user as any).role || 'employee'
        token.db_id = (user as any).db_id || null
        token.is_active = (user as any).is_active ?? true
      }
      return token
    },
    async session({ session, token }) {
      if (session.user) {
        (session.user as any).role = token.role || 'employee';
        (session.user as any).id = token.db_id || null;
        (session.user as any).is_active = token.is_active;
      }
      return session
    },
  },
  pages: {
    signIn: '/login',
  },
})

