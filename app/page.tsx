// বাংলা: এই route-এ ওয়েবসাইটের মূল landing page দেখানো হয়।
import Home from "./home/page";

// বাংলা: এই component root route-কে public home page-এ পাঠায় বা তার entry UI দেখায়।
export default function Page() {
  return <Home />;
}
