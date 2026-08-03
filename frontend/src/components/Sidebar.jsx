import { useState } from "react";
import logo from "../assets/company-logo.png";


export default function Sidebar({
  activePage,
  setActivePage
}) {

  const [hovered, setHovered] = useState(false);


  const navigation = [
    { name: "Dashboard", icon: "▦" },
    { name: "Live Monitoring", icon: "◉" },
    { name: "Analytics", icon: "📊" },
    { name: "Alerts", icon: "⚠" },
    { name: "Events", icon: "☷" },
    { name: "Settings", icon: "⚙" },
  ];


  return (

    <aside

      onMouseEnter={() => setHovered(true)}
      onMouseLeave={() => setHovered(false)}

      className={`
      ${hovered ? "w-72" : "w-24"}

      bg-slate-950
      border-r
      border-slate-800
      flex
      flex-col
      transition-all
      duration-300
      shrink-0

      `}

    >


      {/* COMPANY LOGO */}


      <div
        className="
        p-6
        border-b
        border-slate-800
        "
      >

        <div
          className="
          flex
          items-center
          gap-4
          "
        >

          <img
            src={logo}
            alt="Company"
            className="
            w-12
            h-12
            rounded-xl
            bg-white
            p-2
            "
          />


          {hovered && (

            <div>

              <h1 className="font-bold text-lg">
                Crescent Steel
              </h1>

              <p className="text-xs text-slate-400">
                AI Safety Platform
              </p>

            </div>

          )}


        </div>

      </div>






      {/* NAVIGATION */}


      <nav
        className="
        flex-1
        p-4
        space-y-3
        "
      >


        {
          navigation.map((item)=>{


            const active =
              activePage === item.name;



            return (

              <button

                key={item.name}

                onClick={() =>
                  setActivePage(item.name)
                }


                className={`
                
                w-full
                flex
                items-center
                ${hovered ? "gap-4" : "justify-center"}

                rounded-xl
                px-4
                py-4

                transition-all

                ${
                  active
                  ?
                  "bg-blue-600 text-white shadow-lg shadow-blue-600/30"
                  :
                  "text-slate-400 hover:bg-slate-800 hover:text-white"
                }

                `}

              >


                <span className="text-xl">
                  {item.icon}
                </span>



                {hovered && (

                  <span className="font-medium">
                    {item.name}
                  </span>

                )}


              </button>

            )


          })
        }


      </nav>








      {/* SYSTEM STATUS */}


      <div
        className="
        p-4
        border-t
        border-slate-800
        "
      >


        {hovered && (

          <div
            className="
            bg-slate-900
            rounded-xl
            p-4
            mb-4
            "
          >

            <div
              className="
              flex
              items-center
              gap-2
              "
            >

              <span
                className="
                w-3
                h-3
                bg-green-500
                rounded-full
                animate-pulse
                "
              />


              <span>
                System Online
              </span>


            </div>


            <p
              className="
              text-xs
              text-slate-400
              mt-2
              "
            >
              AI Monitoring Active
            </p>


          </div>

        )}







        {/* COLLAPSE BUTTON */}


      </div>



    </aside>

  );

}
